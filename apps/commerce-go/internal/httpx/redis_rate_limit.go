package httpx

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

func RedisRateLimit(client *redis.Client, logger *slog.Logger, limit int, window time.Duration, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		bucket := time.Now().UTC().Truncate(window).Unix()
		key := "commerce:rate:" + ip + ":" + strconv.FormatInt(bucket, 10)
		ctx, cancel := context.WithTimeout(r.Context(), 250*time.Millisecond)
		count, err := client.Eval(ctx,
			`local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return count`,
			[]string{key}, (window + time.Second).Milliseconds()).Int64()
		cancel()
		if err != nil {
			logger.Warn("rate-limit check failed; allowing request", "error", err, "request_id", RequestID(r.Context()))
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
		remaining := limit - int(count)
		if remaining < 0 {
			remaining = 0
		}
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		if count > int64(limit) {
			w.Header().Set("Retry-After", strconv.Itoa(int(window.Seconds())))
			WriteError(w, r, &APIError{Status: http.StatusTooManyRequests, Code: "RATE_LIMITED", Message: "too many requests"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
