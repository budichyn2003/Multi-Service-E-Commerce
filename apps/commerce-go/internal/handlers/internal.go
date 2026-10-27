package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/marketforge/commerce-go/internal/httpx"
	"github.com/marketforge/commerce-go/internal/repo"
)

type quotePayload struct {
	Items []repo.ReserveInput `json:"items"`
}

func (h *Handlers) QuoteProducts(w http.ResponseWriter, r *http.Request) {
	var request quotePayload
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || len(request.Items) == 0 {
		httpx.WriteError(w, r, httpx.BadRequest("items are required"))
		return
	}
	for _, item := range request.Items {
		if !isValidUUID(item.ProductID) || item.Quantity < 1 || item.Quantity > 999 {
			httpx.WriteError(w, r, httpx.BadRequest("each item needs a valid productId and quantity from 1 to 999"))
			return
		}
	}
	for _, item := range repo.AggregateReserveItems(request.Items) {
		if item.Quantity > 999 {
			httpx.WriteError(w, r, httpx.BadRequest("combined quantity per product cannot exceed 999"))
			return
		}
	}
	products, err := h.store.QuoteProducts(r.Context(), request.Items)
	if err != nil {
		if errors.Is(err, repo.ErrProductNotFound) || errors.Is(err, repo.ErrProductInactive) {
			httpx.WriteError(w, r, httpx.Conflict("PRODUCT_UNAVAILABLE", err.Error()))
			return
		}
		h.logError(r, "quote products", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": products})
}

func (h *Handlers) ConfirmReservation(w http.ResponseWriter, r *http.Request) {
	h.transitionReservation(w, r, repo.ReservationConfirmed)
}

func (h *Handlers) ReleaseReservation(w http.ResponseWriter, r *http.Request) {
	h.transitionReservation(w, r, repo.ReservationReleased)
}

func (h *Handlers) transitionReservation(w http.ResponseWriter, r *http.Request, target string) {
	orderID := r.PathValue("orderID")
	if !isValidUUID(orderID) {
		httpx.WriteError(w, r, httpx.BadRequest("orderID must be a UUID"))
		return
	}
	if err := h.store.TransitionReservations(r.Context(), orderID, target); err != nil {
		switch {
		case errors.Is(err, repo.ErrReservationNotFound):
			httpx.WriteError(w, r, httpx.NotFound("Reservation not found"))
		case errors.Is(err, repo.ErrReservationConflict):
			httpx.WriteError(w, r, httpx.Conflict("RESERVATION_CONFLICT", err.Error()))
		default:
			h.logError(r, "transition reservation", err)
			httpx.WriteError(w, r, httpx.Internal())
		}
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": target})
}
