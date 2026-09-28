// Package auth holds authorization guards. Until the gateway issues and
// validates JWTs (README roadmap Phase 1-3), identity arrives via trusted
// internal headers set by the gateway inside the docker network. Handlers
// never read these headers from client-facing traffic without the gateway.
package auth

import (
	"context"
	"net/http"

	"github.com/marketforge/commerce-go/internal/httpx"
)

type ctxKey string

const (
	userIDKey ctxKey = "auth_user_id"
	roleKey   ctxKey = "auth_role"

	// HeaderUserID / HeaderRole are injected by the gateway after JWT validation.
	HeaderUserID = "X-User-Id"
	HeaderRole   = "X-User-Role"
)

// Identity carries the authenticated caller.
type Identity struct {
	UserID string
	Role   string
}

// FromContext returns the identity, if any.
func FromContext(ctx context.Context) (Identity, bool) {
	id, okID := ctx.Value(userIDKey).(string)
	role, okRole := ctx.Value(roleKey).(string)
	if !okID || !okRole || id == "" {
		return Identity{}, false
	}
	return Identity{UserID: id, Role: role}, true
}

// Identify middleware copies trusted gateway headers into context.
func Identify(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if uid := r.Header.Get(HeaderUserID); uid != "" {
			ctx := context.WithValue(r.Context(), userIDKey, uid)
			ctx = context.WithValue(ctx, roleKey, r.Header.Get(HeaderRole))
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAdmin wraps a handler so only ADMIN role passes.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ident, ok := FromContext(r.Context())
		if !ok || ident.Role != "ADMIN" {
			httpx.WriteError(w, r, httpx.Forbidden("admin role required"))
			return
		}
		next.ServeHTTP(w, r)
	})
}
