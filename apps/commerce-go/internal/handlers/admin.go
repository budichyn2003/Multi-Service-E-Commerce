package handlers

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/marketforge/commerce-go/internal/httpx"
	"github.com/marketforge/commerce-go/internal/repo"
)

// Admin handlers: product & category CRUD, inventory adjustment.
// Routes are wrapped in auth.RequireAdmin (see Routes in handlers.go).

type productPayload struct {
	SKU         string   `json:"sku"`
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Price       *float64 `json:"price"`
	CompareAt   *float64 `json:"compareAtPrice"`
	CategoryID  *string  `json:"categoryId"`
	Status      string   `json:"status"`
	WeightGrams *int     `json:"weightGrams"`
}

func (p *productPayload) validateCreate() *httpx.APIError {
	if p.SKU == "" || p.Slug == "" || p.Name == "" || p.Price == nil {
		return httpx.BadRequest("sku, slug, name, price are required")
	}
	if *p.Price < 0 {
		return httpx.BadRequest("price must be non-negative")
	}
	if p.Status == "" {
		p.Status = "DRAFT"
	}
	switch p.Status {
	case "DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED":
	default:
		return httpx.BadRequest("invalid status")
	}
	return nil
}

// CreateProduct handles POST /api/v1/admin/products.
func (h *Handlers) AdminCreateProduct(w http.ResponseWriter, r *http.Request) {
	var in productPayload
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, r, httpx.BadRequest("invalid JSON body: "+err.Error()))
		return
	}
	if apiErr := in.validateCreate(); apiErr != nil {
		httpx.WriteError(w, r, apiErr)
		return
	}

	p, err := h.store.CreateProduct(r.Context(), repo.ProductInput{
		SKU: in.SKU, Slug: in.Slug, Name: in.Name, Description: in.Description,
		Price: *in.Price, CompareAt: in.CompareAt, CategoryID: in.CategoryID,
		Status: in.Status, WeightGrams: in.WeightGrams,
	})
	if err != nil {
		if isUniqueViolation(err) {
			httpx.WriteError(w, r, httpx.Conflict("CONFLICT", "sku or slug already exists"))
			return
		}
		h.logError(r, "create product", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, p)
}

// UpdateProduct handles PATCH /api/v1/admin/products/{id}.
func (h *Handlers) AdminUpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var in productPayload
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, r, httpx.BadRequest("invalid JSON body: "+err.Error()))
		return
	}
	if in.Price != nil && *in.Price < 0 {
		httpx.WriteError(w, r, httpx.BadRequest("price must be non-negative"))
		return
	}

	var input repo.ProductInput
	if in.Price != nil {
		input.Price = *in.Price
	}
	input.Name = in.Name
	input.Description = in.Description
	input.CompareAt = in.CompareAt
	input.CategoryID = in.CategoryID
	input.Status = in.Status
	input.WeightGrams = in.WeightGrams

	p, err := h.store.UpdateProduct(r.Context(), id, input)
	if err != nil {
		if isUniqueViolation(err) {
			httpx.WriteError(w, r, httpx.Conflict("CONFLICT", "sku or slug already exists"))
			return
		}
		h.logError(r, "update product", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if p == nil {
		httpx.WriteError(w, r, httpx.NotFound("Product not found"))
		return
	}
	httpx.WriteJSON(w, http.StatusOK, p)
}

// ArchiveProduct handles DELETE /api/v1/admin/products/{id}.
func (h *Handlers) AdminArchiveProduct(w http.ResponseWriter, r *http.Request) {
	ok, err := h.store.ArchiveProduct(r.Context(), r.PathValue("id"))
	if err != nil {
		h.logError(r, "archive product", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if !ok {
		httpx.WriteError(w, r, httpx.NotFound("Product not found"))
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ARCHIVED"})
}

type categoryPayload struct {
	Name     string  `json:"name"`
	Slug     string  `json:"slug"`
	ParentID *string `json:"parentId"`
}

// CreateCategory handles POST /api/v1/admin/categories.
func (h *Handlers) AdminCreateCategory(w http.ResponseWriter, r *http.Request) {
	var in categoryPayload
	if err := httpx.DecodeJSON(r, &in); err != nil || in.Name == "" || in.Slug == "" {
		httpx.WriteError(w, r, httpx.BadRequest("name and slug are required"))
		return
	}
	c, err := h.store.CreateCategory(r.Context(), in.Name, in.Slug, in.ParentID)
	if err != nil {
		if isUniqueViolation(err) {
			httpx.WriteError(w, r, httpx.Conflict("CONFLICT", "slug already exists"))
			return
		}
		h.logError(r, "create category", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, c)
}

// UpdateCategory handles PATCH /api/v1/admin/categories/{id}.
func (h *Handlers) AdminUpdateCategory(w http.ResponseWriter, r *http.Request) {
	var in categoryPayload
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, r, httpx.BadRequest("invalid JSON body"))
		return
	}
	c, err := h.store.UpdateCategory(r.Context(), r.PathValue("id"), in.Name, in.ParentID)
	if err != nil {
		h.logError(r, "update category", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if c == nil {
		httpx.WriteError(w, r, httpx.NotFound("Category not found"))
		return
	}
	httpx.WriteJSON(w, http.StatusOK, c)
}

// ArchiveCategory handles DELETE /api/v1/admin/categories/{id}.
func (h *Handlers) AdminArchiveCategory(w http.ResponseWriter, r *http.Request) {
	ok, err := h.store.ArchiveCategory(r.Context(), r.PathValue("id"))
	if err != nil {
		h.logError(r, "archive category", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	if !ok {
		httpx.WriteError(w, r, httpx.NotFound("Category not found"))
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "INACTIVE"})
}

type adjustPayload struct {
	Delta  int     `json:"delta"`
	Reason string  `json:"reason"`
	ActorID *string `json:"actorId"`
}

// AdjustInventory handles POST /api/v1/admin/inventory/{productId}/adjust.
func (h *Handlers) AdminAdjustInventory(w http.ResponseWriter, r *http.Request) {
	var in adjustPayload
	if err := httpx.DecodeJSON(r, &in); err != nil || in.Delta == 0 {
		httpx.WriteError(w, r, httpx.BadRequest("non-zero delta is required"))
		return
	}
	actorID := ""
	if in.ActorID != nil {
		actorID = *in.ActorID
	}

	inv, err := h.store.AdjustInventory(r.Context(), r.PathValue("productId"), in.Delta, in.Reason, actorID)
	if err != nil {
		if isCheckViolation(err) {
			httpx.WriteError(w, r, httpx.Conflict("CONFLICT", "adjustment would make stock negative"))
			return
		}
		h.logError(r, "adjust inventory", err)
		httpx.WriteError(w, r, httpx.Internal())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, inv)
}

// logError centralizes structured error logging with request id.
func (h *Handlers) logError(r *http.Request, op string, err error) {
	h.logger.Error(op+" failed", "error", err, "request_id", httpx.RequestID(r.Context()))
}

// isUniqueViolation reports PostgreSQL unique constraint errors (23505).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

// isCheckViolation reports PostgreSQL CHECK constraint errors (23514).
func isCheckViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23514"
	}
	return false
}
