package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/marketforge/commerce-go/internal/config"
	"github.com/marketforge/commerce-go/internal/handlers"
	"github.com/marketforge/commerce-go/internal/httpx"
	"github.com/marketforge/commerce-go/internal/repo"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg := config.Load()
	ctx := context.Background()

	pool, err := config.ConnectPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	logger.Info("postgres connected", "env", cfg.Env)

	redisClient, err := config.ConnectRedis(ctx, cfg.RedisURL)
	if err != nil {
		logger.Error("redis connection failed", "error", err)
		os.Exit(1)
	}
	defer redisClient.Close()
	logger.Info("redis connected")

	store := repo.NewStore(pool, redisClient)
	h := handlers.New(store, logger, cfg.InternalServiceToken)

	mux := http.NewServeMux()

	// Health endpoints (liveness / readiness).
	mux.HandleFunc("GET /health", h.Health)
	mux.HandleFunc("GET /ready", h.Ready)

	// API v1 — catalog & cart (auth added in later phases).
	api := httpx.RedisRateLimit(redisClient, logger, 120, time.Minute, h.Routes())
	mux.Handle("/api/v1/", httpx.RequestIDMiddleware(httpx.LoggingMiddleware(logger, api)))

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("commerce-go listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}
