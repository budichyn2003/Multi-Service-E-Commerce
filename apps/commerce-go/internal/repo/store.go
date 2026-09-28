package repo

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Slug     string    `json:"slug"`
	ParentID *string   `json:"parentId,omitempty"`
	Status   string    `json:"status"`
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
	pool *pgxpool.Pool
}

// NewStore constructs a Store.
func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// ListProducts returns paginated ACTIVE products with optional search/filters.
func (s *Store) ListProducts(ctx context.Context, q ProductQuery) ([]Product, int, error) {
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
		"newest":       "created_at DESC",
		"price_asc":    "price ASC",
		"price_desc":   "price DESC",
		"name_asc":     "name ASC",
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
	return products, total, rows.Err()
}

// GetProductBySlug fetches one product by slug.
func (s *Store) GetProductBySlug(ctx context.Context, slug string) (*Product, error) {
	p := &Product{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, sku, slug, name, coalesce(description,''), price, compare_at_price, category_id, status, weight_grams, created_at, updated_at
		 FROM commerce.products WHERE slug = $1`, slug).
		Scan(&p.ID, &p.SKU, &p.Slug, &p.Name, &p.Description, &p.Price, &p.CompareAt,
			&p.CategoryID, &p.Status, &p.WeightGrams, &p.CreatedAt, &p.UpdatedAt)
	if errorsIs(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return p, err
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

	for _, it := range items {
		tag, err := tx.Exec(ctx,
			`UPDATE commerce.inventory
			   SET reserved_quantity = reserved_quantity + $2,
			       available_quantity = available_quantity - $2,
			       updated_at = now()
			 WHERE product_id = $1 AND available_quantity >= $2`,
			it.ProductID, it.Quantity)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return ErrInsufficientInventory
		}
		_, err = tx.Exec(ctx,
			`INSERT INTO commerce.reservations (id, order_id, product_id, quantity, status, expires_at)
			 VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE', now() + $4)`,
			orderID, it.ProductID, it.Quantity, ttl)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// Domain error for mapping to a typed HTTP error.
var ErrInsufficientInventory = &InsufficientInventoryError{}

type InsufficientInventoryError struct{}

func (*InsufficientInventoryError) Error() string { return "insufficient inventory" }
