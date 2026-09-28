package handlers

import (
	"errors"
	"net/http"

	"github.com/marketforge/commerce-go/internal/auth"
	"github.com/marketforge/commerce-go/internal/httpx"
	"github.com/marketforge/commerce-go/internal/repo"
)

// Cart handlers. Identity comes from the gateway via X-User-Id (until JWT
// validation moves into this service); cart access is always scoped to the
// authenticated user, never a client-supplied cart id.

type cartItemPayload struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

// GetCart handles GET /api/v1/cart.
func (h *Handlers) GetCart(w http.ResponseWriter, r *http.Request) {
	ident, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.WriteError(w, r, httpx.Unauthorized("authentication required"))
		return
	}
	items, err := h.store.GetCartItems(r.Context(), ident.UserID)
	if err != nil {
		h.logError(r, "get cart", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// AddCartItem handles POST /api/v1/cart/items.
func (h *Handlers) AddCartItem(w http.ResponseWriter, r *http.Request) {
	ident, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.WriteError(w, r, httpx.Unauthorized("authentication required"))
		return
	}
	var in cartItemPayload
	if err := httpx.DecodeJSON(r, &in); err != nil || in.ProductID == "" {
		httpx.WriteError(w, r, httpx.BadRequest("productId is required"))
		return
	}
	if in.Quantity <= 0 {
		in.Quantity = 1
	}
	if in.Quantity > 999 {
		httpx.WriteError(w, r, httpx.BadRequest("quantity too large"))
		return
	}

	item, err := h.store.AddCartItem(r.Context(), ident.UserID, in.ProductID, in.Quantity)
	switch {
	case errors.Is(err, repo.ErrProductNotFound):
		httpx.WriteError(w, r, httpx.NotFound("Product not found"))
	case errors.Is(err, repo.ErrProductInactive):
		httpx.WriteError(w, r, httpx.Conflict("PRODUCT_INACTIVE", "product is not purchasable"))
	case err != nil:
		h.logError(r, "add cart item", err)
		httpx.WriteError(w, r, httpx.Internal())
	default:
		httpx.WriteJSON(w, http.StatusCreated, item)
	}
}

// UpdateCartItem handles PATCH /api/v1/cart/items/{id}.
func (h *Handlers) UpdateCartItem(w http.ResponseWriter, r *http.Request) {
	ident, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.WriteError(w, r, httpx.Unauthorized("authentication required"))
		return
	}
	var in cartItemPayload
	if err := httpx.DecodeJSON(r, &in); err != nil || in.Quantity <= 0 {
		httpx.WriteError(w, r, httpx.BadRequest("quantity must be positive"))
		return
	}

	item, err := h.store.UpdateCartItem(r.Context(), ident.UserID, r.PathValue("id"), in.Quantity)
	if err != nil {
		h.logError(r, "update cart item", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if item == nil {
		httpx.WriteError(w, r, httpx.NotFound("Cart item not found"))
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item)
}

// RemoveCartItem handles DELETE /api/v1/cart/items/{id}.
func (h *Handlers) RemoveCartItem(w http.ResponseWriter, r *http.Request) {
	ident, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.WriteError(w, r, httpx.Unauthorized("authentication required"))
		return
	}
	okRemoved, err := h.store.RemoveCartItem(r.Context(), ident.UserID, r.PathValue("id"))
	if err != nil {
		h.logError(r, "remove cart item", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if !okRemoved {
		httpx.WriteError(w, r, httpx.NotFound("Cart item not found"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
