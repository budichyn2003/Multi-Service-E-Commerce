package handlers

import (
	"errors"
	"net/http"

	"github.com/marketforge/commerce-go/internal/auth"
	"github.com/marketforge/commerce-go/internal/httpx"
	"github.com/marketforge/commerce-go/internal/repo"
)

// AdminGetProduct handles GET /api/v1/admin/products/{id} (any status).
func (h *Handlers) AdminGetProduct(w http.ResponseWriter, r *http.Request) {
	p, err := h.store.GetProductByID(r.Context(), r.PathValue("id"))
	if err != nil {
		h.logError(r, "get product by id", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if p == nil {
		httpx.WriteError(w, r, httpx.NotFound("Product not found"))
		return
	}
	httpx.WriteJSON(w, http.StatusOK, p)
}

// Checkout handles POST /api/v1/checkout.
//
// Flow (requirements §22): load cart → validate status + stock → recompute
// prices server-side → reserve inventory atomically → return the priced
// summary. Order persistence happens next in order-service (Phase 4 wiring);
// the reservation reference is the correlation token between the two.
func (h *Handlers) Checkout(w http.ResponseWriter, r *http.Request) {
	ident, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.WriteError(w, r, httpx.Unauthorized("authentication required"))
		return
	}

	// Phase 4 will pass the pending order id here; until then the reference is
	// derived from the user id so reservations remain traceable.
	reference := ident.UserID

	result, err := h.store.ValidateAndReserve(r.Context(), ident.UserID, reference, reservationTTL)
	if err != nil {
		var ce *repo.CheckoutErrors
		if errors.As(err, &ce) {
			httpx.WriteJSON(w, http.StatusConflict, map[string]any{
				"success": false,
				"error": map[string]any{
					"code":      "CHECKOUT_INVALID",
					"problems":  ce.Problems,
					"requestId": httpx.RequestID(r.Context()),
				},
			})
			return
		}
		h.logError(r, "checkout", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"status":    "RESERVED",
		"reference": result.Reference,
		"summary":   result,
	})
}
