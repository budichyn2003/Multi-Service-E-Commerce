// Package httpx holds shared HTTP plumbing: the standard error envelope,
// request-id middleware, logging, and panic recovery.
package httpx

import (
	"context"
	crand "crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// Error envelope per API.md.
type errorBody struct {
	Success bool   `json:"success"`
	Error   errDst `json:"error"`
}

type errDst struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
}

// APIError is a typed error carried by handlers.
type APIError struct {
	Status  int
	Code    string
	Message string
}

func (e *APIError) Error() string { return e.Message }

// Common constructors.
func NotFound(msg string) *APIError   { return &APIError{404, "NOT_FOUND", msg} }
func BadRequest(msg string) *APIError { return &APIError{400, "VALIDATION_ERROR", msg} }
func Unauthorized(msg string) *APIError {
	return &APIError{401, "UNAUTHORIZED", msg}
}
func Forbidden(msg string) *APIError { return &APIError{403, "FORBIDDEN", msg} }
func Conflict(code, msg string) *APIError {
	return &APIError{409, code, msg}
}
func Internal() *APIError { return &APIError{500, "INTERNAL", "internal server error"} }

// DecodeJSON decodes a strict JSON body into dst.
func DecodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	// Reject trailing content.
	if dec.Decode(new(json.RawMessage)) != io.EOF {
		return errors.New("unexpected trailing JSON content")
	}
	return nil
}

type ctxKey string

const requestIDKey ctxKey = "request_id"

// RequestIDMiddleware ensures every request has an X-Request-Id.
func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" {
			id = "req_" + randHex(8)
		}
		w.Header().Set("X-Request-Id", id)
		ctx := context.WithValue(r.Context(), requestIDKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequestID extracts the request id from context.
func RequestID(ctx context.Context) string {
	if v, ok := ctx.Value(requestIDKey).(string); ok {
		return v
	}
	return ""
}

// LoggingMiddleware emits one structured line per request and recovers panics.
func LoggingMiddleware(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: 200}
		defer func() {
			if rec := recover(); rec != nil {
				logger.Error("panic recovered",
					"request_id", RequestID(r.Context()),
					"path", r.URL.Path, "panic", rec)
				WriteError(sw, r, Internal())
			}
			logger.Info("request",
				"request_id", RequestID(r.Context()),
				"method", r.Method,
				"path", r.URL.Path,
				"status_code", sw.status,
				"duration_ms", time.Since(start).Milliseconds())
		}()
		next.ServeHTTP(sw, r)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// WriteJSON writes a success envelope.
func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data":    data,
	})
}

// WriteError writes the standard error envelope.
func WriteError(w http.ResponseWriter, r *http.Request, apiErr *APIError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(apiErr.Status)
	_ = json.NewEncoder(w).Encode(errorBody{
		Success: false,
		Error: errDst{
			Code:      apiErr.Code,
			Message:   apiErr.Message,
			RequestID: RequestID(r.Context()),
		},
	})
}

// randHex returns n random bytes hex-encoded (used for request ids).
func randHex(n int) string {
	buf := make([]byte, n)
	// crypto/rand, ignoring the impossible error for buffer fills
	_, _ = crand.Read(buf)
	return hex.EncodeToString(buf)
}
