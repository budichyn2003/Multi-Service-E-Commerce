package repo

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// Product is the catalog aggregate used across the commerce API.
type Product struct {
	ID          string    `json:"id"`
	SKU         string    `json:"sku"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	CompareAt   *float64  `json:"compareAtPrice,omitempty"`
	CategoryID  *string   `json:"categoryId,omitempty"`
	Status      string    `json:"status"`
	WeightGrams *int      `json:"weightGrams,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Category is a hierarchical catalog node.
type Category struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	ParentID  *string   `json:"parentId,omitempty"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

// Inventory mirrors the inventory table row.
type Inventory struct {
	ProductID         string    `json:"productId"`
	AvailableQuantity int       `json:"availableQuantity"`
	ReservedQuantity  int       `json:"reservedQuantity"`
	SoldQuantity      int       `json:"soldQuantity"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// Store wraps the pgx pool with domain queries.
type Store struct {
	pool  *pgxpool.Pool
	redis *redis.Client
}

// NewStore constructs a Store.
func NewStore(pool *pgxpool.Pool, clients ...*redis.Client) *Store {
	store := &Store{pool: pool}
	if len(clients) > 0 {
		store.redis = clients[0]
	}
	return store
}

// ListProducts returns paginated ACTIVE products with optional search/filters.
func (s *Store) ListProducts(ctx context.Context, q ProductQuery) ([]Product, int, error) {
	cacheKey := s.catalogCacheKey(ctx, "list", q)
	if cacheKey != "" {
		if value, err := s.redis.Get(ctx, cacheKey).Bytes(); err == nil {
			var cached struct {
				Products []Product `json:"products"`
				Total    int       `json:"total"`
			}
			if err := json.Unmarshal(value, &cached); err == nil {
				return cached.Products, cached.Total, nil
			}
			slog.Warn("invalid product-list cache entry", "error", err)
		} else if err != redis.Nil {
			slog.Warn("product-list cache read failed", "error", err)
		}
	}
	where := []string{"status = 'ACTIVE'"}
	args := []any{}
	add := func(cond string, val any) {
		args = append(args, val)
		where = append(where, cond)
	}

	if q.Search != "" {
		args = append(args, q.Search)
		n := len(args)
		where = append(where, "(name ILIKE '%' || $"+itoa(n)+" || '%' OR description ILIKE '%' || $"+itoa(n)+" || '%')")
	}
	if q.CategorySlug != "" {
		add("category_id = (SELECT id FROM commerce.categories WHERE slug = $"+itoa(len(args)+1)+")", q.CategorySlug)
	}
	if q.MinPrice != nil {
		add("price >= $"+itoa(len(args)+1), *q.MinPrice)
	}
	if q.MaxPrice != nil {
		add("price <= $"+itoa(len(args)+1), *q.MaxPrice)
	}

	whereSQL := " WHERE " + join(where, " AND ")

	var total int
	if err := s.pool.QueryRow(ctx,
		"SELECT count(*) FROM commerce.products"+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sort := map[string]string{
		"newest":     "created_at DESC",
		"price_asc":  "price ASC",
		"price_desc": "price DESC",
		"name_asc":   "name ASC",
	}[q.Sort]
	if sort == "" {
		sort = "created_at DESC"
	}

	limit := q.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (q.Page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	args = append(args, limit, offset)
	rows, err := s.pool.Query(ctx,
		"SELECT id, sku, slug, name, coalesce(description,''), price, compare_at_price, category_id, status, weight_grams, created_at, updated_at "+
			"FROM commerce.products"+whereSQL+
			" ORDER BY "+sort+" LIMIT $"+itoa(len(args)-1)+" OFFSET $"+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		p := Product{}
		if err := rows.Scan(&p.ID, &p.SKU, &p.Slug, &p.Name, &p.Description, &p.Price, &p.CompareAt,
			&p.CategoryID, &p.Status, &p.WeightGrams, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, 0, err
		}
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	if cacheKey != "" {
		value, err := json.Marshal(struct {
			Products []Product `json:"products"`
			Total    int       `json:"total"`
		}{Products: products, Total: total})
		if err == nil {
			if err := s.redis.Set(ctx, cacheKey, value, 30*time.Second).Err(); err != nil {
				slog.Warn("product-list cache write failed", "error", err)
			}
		}
	}
	return products, total, nil
}

// GetProductBySlug fetches one product by slug.
func (s *Store) GetProductBySlug(ctx context.Context, slug string) (*Product, error) {
	cacheKey := s.catalogCacheKey(ctx, "product:"+slug, nil)
	if cacheKey != "" {
		value, err := s.redis.Get(ctx, cacheKey).Bytes()
		if err == nil {
			var cached Product
			if err := json.Unmarshal(value, &cached); err == nil {
				return &cached, nil
			}
			slog.Warn("invalid product cache entry", "error", err)
		} else if err != redis.Nil {
			slog.Warn("product cache read failed", "error", err)
		}
	}
	p := &Product{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, sku, slug, name, coalesce(description,''), price, compare_at_price, category_id, status, weight_grams, created_at, updated_at
		 FROM commerce.products WHERE slug = $1`, slug).
		Scan(&p.ID, &p.SKU, &p.Slug, &p.Name, &p.Description, &p.Price, &p.CompareAt,
			&p.CategoryID, &p.Status, &p.WeightGrams, &p.CreatedAt, &p.UpdatedAt)
	if errorsIs(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err == nil && cacheKey != "" {
		if value, marshalErr := json.Marshal(p); marshalErr == nil {
			if setErr := s.redis.Set(ctx, cacheKey, value, 30*time.Second).Err(); setErr != nil {
				slog.Warn("product cache write failed", "error", setErr)
			}
		}
	}
	return p, err
}

func (s *Store) catalogCacheKey(ctx context.Context, suffix string, query any) string {
	if s.redis == nil {
		return ""
	}
	version, err := s.redis.Get(ctx, "commerce:catalog:version").Result()
	if err == redis.Nil {
		version = "0"
	} else if err != nil {
		slog.Warn("catalog cache version read failed", "error", err)
		return ""
	}
	payload := []byte(suffix)
	if query != nil {
		encoded, err := json.Marshal(query)
		if err != nil {
			slog.Warn("catalog cache key encoding failed", "error", err)
			return ""
		}
		payload = append(payload, ':')
		payload = append(payload, encoded...)
	}
	return fmt.Sprintf("commerce:catalog:%s:%x", version, sha256.Sum256(payload))
}

func (s *Store) invalidateCatalog(ctx context.Context) {
	if s.redis == nil {
		return
	}
	if err := s.redis.Incr(ctx, "commerce:catalog:version").Err(); err != nil {
		slog.Warn("catalog cache invalidation failed", "error", err)
	}
}

// ListCategories returns all active categories.
func (s *Store) ListCategories(ctx context.Context) ([]Category, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, slug, parent_id, status, created_at
		 FROM commerce.categories WHERE status = 'ACTIVE' ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cats := []Category{}
	for rows.Next() {
		c := Category{}
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.ParentID, &c.Status, &c.CreatedAt); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

// GetInventory returns the inventory row for a product.
func (s *Store) GetInventory(ctx context.Context, productID string) (*Inventory, error) {
	inv := &Inventory{}
	err := s.pool.QueryRow(ctx,
		`SELECT product_id, available_quantity, reserved_quantity, sold_quantity, updated_at
		 FROM commerce.inventory WHERE product_id = $1`, productID).
		Scan(&inv.ProductID, &inv.AvailableQuantity, &inv.ReservedQuantity, &inv.SoldQuantity, &inv.UpdatedAt)
	if errorsIs(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return inv, err
}

// ProductQuery carries list endpoint filters.
type ProductQuery struct {
	Search       string
	CategorySlug string
	MinPrice     *float64
	MaxPrice     *float64
	Sort         string
	Page         int
	Limit        int
}

// ReserveInput is one item in a Reserve call.
type ReserveInput struct {
	ProductID string
	Quantity  int
}

// ReserveInventory atomically reserves stock inside a single transaction.
// The conditional UPDATE makes concurrent reservations safe: the row lock plus
// the WHERE clause guarantee available_quantity never goes negative.
func (s *Store) ReserveInventory(ctx context.Context, orderID string, items []ReserveInput, ttl time.Duration) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, orderID); err != nil {
		return err
	}

	normalized := AggregateReserveItems(items)
	quantities := make(map[string]int, len(normalized))
	productIDs := make([]string, 0, len(normalized))
	for _, item := range normalized {
		quantities[item.ProductID] = item.Quantity
		productIDs = append(productIDs, item.ProductID)
	}

	existingRows, err := tx.Query(ctx,
		`SELECT product_id, quantity, status FROM commerce.reservations
		 WHERE order_id = $1 ORDER BY product_id FOR UPDATE`, orderID)
	if err != nil {
		return err
	}

	existing := make(map[string]ReserveInput)
	existingStatus := ""
	for existingRows.Next() {
		var id, status string
		var quantity int
		if err := existingRows.Scan(&id, &quantity, &status); err != nil {
			existingRows.Close()
			return err
		}
		if _, duplicate := existing[id]; duplicate {
			existingRows.Close()
			return ErrReservationConflict
		}
		existing[id] = ReserveInput{ProductID: id, Quantity: quantity}
		existingStatus = status
		if existingStatus != ReservationActive {
			existingRows.Close()
			return ErrReservationConflict
		}
	}
	if err := existingRows.Err(); err != nil {
		existingRows.Close()
		return err
	}
	existingRows.Close()
	if len(existing) > 0 {
		if len(existing) != len(quantities) {
			return ErrReservationConflict
		}
		for id, quantity := range quantities {
			if existing[id].Quantity != quantity {
				return ErrReservationConflict
			}
		}
		return tx.Commit(ctx)
	}

	for _, productID := range productIDs {
		quantity := quantities[productID]
		tag, err := tx.Exec(ctx,
			`UPDATE commerce.inventory
			   SET reserved_quantity = reserved_quantity + $2,
			       available_quantity = available_quantity - $2,
			       updated_at = now()
			 WHERE product_id = $1 AND available_quantity >= $2`,
			productID, quantity)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return ErrInsufficientInventory
		}
		_, err = tx.Exec(ctx,
			`INSERT INTO commerce.reservations (id, order_id, product_id, quantity, status, expires_at)
			 VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE', now() + $4)`,
			orderID, productID, quantity, ttl)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func AggregateReserveItems(items []ReserveInput) []ReserveInput {
	quantities := make(map[string]int, len(items))
	for _, item := range items {
		quantities[item.ProductID] += item.Quantity
	}
	productIDs := make([]string, 0, len(quantities))
	for id := range quantities {
		productIDs = append(productIDs, id)
	}
	sort.Strings(productIDs)
	result := make([]ReserveInput, 0, len(productIDs))
	for _, id := range productIDs {
		result = append(result, ReserveInput{ProductID: id, Quantity: quantities[id]})
	}
	return result
}

// Domain error for mapping to a typed HTTP error.
var ErrInsufficientInventory = &InsufficientInventoryError{}

type InsufficientInventoryError struct{}

func (*InsufficientInventoryError) Error() string { return "insufficient inventory" }
