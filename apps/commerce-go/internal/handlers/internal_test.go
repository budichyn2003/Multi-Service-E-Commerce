package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestInternalEndpointsRequireServiceToken(t *testing.T) {
	h := &Handlers{internalToken: "expected-secret"}
	called := false
	protected := h.requireInternal(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	for _, token := range []string{"", "wrong", "expected-secret"} {
		called = false
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		if token != "" {
			req.Header.Set("X-Internal-Token", token)
		}
		recorder := httptest.NewRecorder()
		protected.ServeHTTP(recorder, req)
		if token == "expected-secret" {
			if !called || recorder.Code != http.StatusNoContent {
				t.Fatalf("expected authorized request, called=%v status=%d", called, recorder.Code)
			}
		} else if called || recorder.Code != http.StatusUnauthorized {
			t.Fatalf("expected unauthorized request, called=%v status=%d", called, recorder.Code)
		}
	}
}
