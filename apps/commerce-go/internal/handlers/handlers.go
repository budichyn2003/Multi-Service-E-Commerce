package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"

	"github.com/marketforge/commerce-go/internal/auth"
	"github.com/marketforge/commerce-go/internal/httpx"
	"github.com/marketforge/commerce-go/internal/repo"
)

// Handlers exposes catalog/inventory endpoints on /api/v1.
type Handlers struct {
	store         *repo.Store
	logger        *slog.Logger
	internalToken string
}

// New constructs Handlers.
func New(store *repo.Store, logger *slog.Logger, internalTokens ...string) *Handlers {
	token := os.Getenv("INTERNAL_SERVICE_TOKEN")
	if len(internalTokens) > 0 {
		token = internalTokens[0]
	}
	return &Handlers{store: store, logger: logger, internalToken: token}
}

// Routes returns the API subtree mux.
// Public routes need no identity; /admin/** is gated by RequireAdmin (RBAC,
// requirements §12); cart/checkout require an authenticated identity injected
// by the gateway via X-User-Id headers (auth.Identify).
func (h *Handlers) Routes() http.Handler {
	mux := http.NewServeMux()

	// Public catalog.
	mux.HandleFunc("GET /api/v1/products", h.ListProducts)
	mux.HandleFunc("GET /api/v1/products/{slug}", h.GetProduct)
	mux.HandleFunc("GET /api/v1/categories", h.ListCategories)

	// Admin — catalog & inventory management (RBAC: ADMIN only).
	mux.Handle("POST /api/v1/admin/products", admin(h, http.HandlerFunc(h.AdminCreateProduct)))
	mux.Handle("GET /api/v1/admin/products/{id}", admin(h, http.HandlerFunc(h.AdminGetProduct)))
	mux.Handle("PATCH /api/v1/admin/products/{id}", admin(h, http.HandlerFunc(h.AdminUpdateProduct)))
	mux.Handle("DELETE /api/v1/admin/products/{id}", admin(h, http.HandlerFunc(h.AdminArchiveProduct)))
	mux.Handle("POST /api/v1/admin/categories", admin(h, http.HandlerFunc(h.AdminCreateCategory)))
	mux.Handle("PATCH /api/v1/admin/categories/{id}", admin(h, http.HandlerFunc(h.AdminUpdateCategory)))
	mux.Handle("DELETE /api/v1/admin/categories/{id}", admin(h, http.HandlerFunc(h.AdminArchiveCategory)))
	mux.Handle("POST /api/v1/admin/inventory/{productId}/adjust", admin(h, http.HandlerFunc(h.AdminAdjustInventory)))

	// Internal — service-to-service (order-service reservation); request-scoped
	// UUID validation keeps malformed references out of PostgreSQL.
	mux.Handle("POST /api/v1/inventory/reserve", h.requireInternal(http.HandlerFunc(h.Reserve)))
	mux.Handle("POST /api/v1/internal/products/quote", h.requireInternal(http.HandlerFunc(h.QuoteProducts)))
	mux.Handle("POST /api/v1/internal/inventory/{orderID}/confirm", h.requireInternal(http.HandlerFunc(h.ConfirmReservation)))
	mux.Handle("POST /api/v1/internal/inventory/{orderID}/release", h.requireInternal(http.HandlerFunc(h.ReleaseReservation)))

	// Customer cart & checkout — require identity.
	mux.Handle("GET /api/v1/cart", customer(http.HandlerFunc(h.GetCart)))
	mux.Handle("POST /api/v1/cart/items", customer(http.HandlerFunc(h.AddCartItem)))
	mux.Handle("PATCH /api/v1/cart/items/{id}", customer(http.HandlerFunc(h.UpdateCartItem)))
	mux.Handle("DELETE /api/v1/cart/items/{id}", customer(http.HandlerFunc(h.RemoveCartItem)))
	mux.Handle("POST /api/v1/checkout", customer(http.HandlerFunc(h.Checkout)))

	return mux
}

func (h *Handlers) requireInternal(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		provided := r.Header.Get("X-Internal-Token")
		if h.internalToken == "" || len(provided) != len(h.internalToken) ||
			subtle.ConstantTimeCompare([]byte(provided), []byte(h.internalToken)) != 1 {
			httpx.WriteError(w, r, httpx.Unauthorized("internal service authentication required"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// admin composes identity extraction + role check.
func admin(h *Handlers, next http.Handler) http.Handler {
	return auth.Identify(auth.RequireAdmin(next))
}

// customer composes identity extraction only.
func customer(next http.Handler) http.Handler {
	return auth.Identify(next)
}

// Health is the liveness probe.
func (h *Handlers) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Ready is the readiness probe (checks PostgreSQL).
func (h *Handlers) Ready(w http.ResponseWriter, r *http.Request) {
	if err := h.store.Ping(r.Context()); err != nil {
		httpx.WriteError(w, r, &httpx.APIError{Status: 503, Code: "SERVICE_UNAVAILABLE", Message: "postgres unavailable"})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

// ListProducts handles GET /api/v1/products.
func (h *Handlers) ListProducts(w http.ResponseWriter, r *http.Request) {
	q := repo.ProductQuery{
		Search:       r.URL.Query().Get("q"),
		CategorySlug: r.URL.Query().Get("category"),
		Sort:         r.URL.Query().Get("sort"),
		Page:         atoiDefault(r.URL.Query().Get("page"), 1),
		Limit:        atoiDefault(r.URL.Query().Get("limit"), 20),
	}
	if v := r.URL.Query().Get("minPrice"); v != "" {
		if f, err := parsePrice(v); err == nil {
			q.MinPrice = &f
		} else {
			httpx.WriteError(w, r, httpx.BadRequest("minPrice must be a number"))
			return
		}
	}
	if v := r.URL.Query().Get("maxPrice"); v != "" {
		if f, err := parsePrice(v); err == nil {
			q.MaxPrice = &f
		} else {
			httpx.WriteError(w, r, httpx.BadRequest("maxPrice must be a number"))
			return
		}
	}

	products, total, err := h.store.ListProducts(r.Context(), q)
	if err != nil {
		h.logger.Error("list products failed", "error", err, "request_id", httpx.RequestID(r.Context()))
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"items": products,
		"pagination": map[string]any{
			"page":  q.Page,
			"limit": q.Limit,
			"total": total,
		},
	})
}

// GetProduct handles GET /api/v1/products/{slug}.
func (h *Handlers) GetProduct(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	product, err := h.store.GetProductBySlug(r.Context(), slug)
	if err != nil {
		h.logger.Error("get product failed", "error", err, "request_id", httpx.RequestID(r.Context()))
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if product == nil || product.Status == "ARCHIVED" {
		httpx.WriteError(w, r, httpx.NotFound("Product not found"))
		return
	}
	httpx.WriteJSON(w, http.StatusOK, product)
}

// ListCategories handles GET /api/v1/categories.
func (h *Handlers) ListCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.store.ListCategories(r.Context())
	if err != nil {
		h.logger.Error("list categories failed", "error", err, "request_id", httpx.RequestID(r.Context()))
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, cats)
}

// GetInventory handles GET /api/v1/inventory/{productId}.
func (h *Handlers) GetInventory(w http.ResponseWriter, r *http.Request) {
	inv, err := h.store.GetInventory(r.Context(), r.PathValue("productId"))
	if err != nil {
		h.logger.Error("get inventory failed", "error", err, "request_id", httpx.RequestID(r.Context()))
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if inv == nil {
		httpx.WriteError(w, r, httpx.NotFound("Inventory not found"))
		return
	}
	httpx.WriteJSON(w, http.StatusOK, inv)
}

type reserveRequest struct {
	OrderID string `json:"orderId"`
	Items   []struct {
		ProductID string `json:"productId"`
		Quantity  int    `json:"quantity"`
	} `json:"items"`
}

// Reserve handles POST /api/v1/inventory/reserve (called by order-service).
func (h *Handlers) Reserve(w http.ResponseWriter, r *http.Request) {
	var req reserveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.OrderID == "" || len(req.Items) == 0 {
		httpx.WriteError(w, r, httpx.BadRequest("orderId and items are required"))
		return
	}
	if !isValidUUID(req.OrderID) {
		httpx.WriteError(w, r, httpx.BadRequest("orderId must be a UUID"))
		return
	}
	items := make([]repo.ReserveInput, 0, len(req.Items))
	for _, it := range req.Items {
		if it.ProductID == "" || it.Quantity <= 0 {
			httpx.WriteError(w, r, httpx.BadRequest("each item needs productId and positive quantity"))
			return
		}
		if !isValidUUID(it.ProductID) {
			httpx.WriteError(w, r, httpx.BadRequest("each productId must be a UUID"))
			return
		}
		items = append(items, repo.ReserveInput{ProductID: it.ProductID, Quantity: it.Quantity})
	}

	if err := h.store.ReserveInventory(r.Context(), req.OrderID, items, reservationTTL); err != nil {
		if errors.As(err, new(*repo.InsufficientInventoryError)) {
			httpx.WriteError(w, r, httpx.Conflict("INSUFFICIENT_INVENTORY", "insufficient inventory"))
			return
		}
		h.logger.Error("reserve failed", "error", err, "request_id", httpx.RequestID(r.Context()))
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "RESERVED"})
}
