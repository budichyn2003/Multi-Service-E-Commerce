package config

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Config holds all runtime configuration loaded from the environment.
type Config struct {
	Port        string
	DatabaseURL string
	Env         string
}

// Load reads configuration from environment variables with sensible
// docker-compose defaults.
func Load() Config {
	return Config{
		Port:        getenv("PORT", "8080"),
		DatabaseURL: getenv("DATABASE_URL", "postgres://marketforge:marketforge@postgres:5432/marketforge"),
		Env:         getenv("APP_ENV", "development"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ConnectPostgres opens a pgx pool with conservative defaults and waits until
// the database accepts connections (bounded by timeout).
func ConnectPostgres(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	cfg.MinConns = 2
	cfg.MaxConnLifetime = time.Hour

	deadline := time.Now().Add(30 * time.Second)
	for {
		pool, err := pgxpool.NewWithConfig(ctx, cfg)
		if err == nil {
			pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			err = pool.Ping(pingCtx)
			cancel()
			if err == nil {
				return pool, nil
			}
			pool.Close()
		}
		if time.Now().After(deadline) {
			return nil, err
		}
		slog.Warn("postgres not ready, retrying", "error", err)
		time.Sleep(2 * time.Second)
	}
}
