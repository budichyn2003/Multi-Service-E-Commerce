package repo

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// Domain errors mapped to typed HTTP errors by handlers.
var (
	ErrProductNotFound = errors.New("product not found")
	ErrProductInactive = errors.New("product is not purchasable")
)

// Cart is the customer's active cart.
type Cart struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CartItem is a line in the cart, enriched with current catalog state so the
// checkout path can detect price/status drift.
type CartItem struct {
	ID                string    `json:"id"`
	ProductID         string    `json:"productId"`
	Slug              string    `json:"slug"`
	Name              string    `json:"name"`
	Quantity          int       `json:"quantity"`
	UnitPriceSnapshot float64   `json:"unitPriceSnapshot"`
	CurrentPrice      float64   `json:"currentPrice"`
	Status            string    `json:"status"`
	Available         int       `json:"available"`
	CreatedAt         time.Time `json:"createdAt"`
}

// GetOrCreateCart returns the customer's single active cart.
func (s *Store) GetOrCreateCart(ctx context.Context, userID string) (Cart, error) {
	var c Cart
	err := s.pool.QueryRow(ctx,
		`INSERT INTO commerce.carts (user_id) VALUES ($1)
		 ON CONFLICT (user_id) DO UPDATE SET updated_at = commerce.carts.updated_at
		 RETURNING id, user_id, created_at, updated_at`, userID).
		Scan(&c.ID, &c.UserID, &c.CreatedAt, &c.UpdatedAt)
	return c, err
}

// GetCartItems returns the cart lines joined with current product/inventory state.
func (s *Store) GetCartItems(ctx context.Context, userID string) ([]CartItem, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ci.id, ci.product_id, p.slug, p.name, ci.quantity, ci.unit_price_snapshot,
		        p.price, p.status, coalesce(i.available_quantity, 0), ci.created_at
		 FROM commerce.cart_items ci
		 JOIN commerce.carts c      ON c.id = ci.cart_id
		 JOIN commerce.products p   ON p.id = ci.product_id
		 LEFT JOIN commerce.inventory i ON i.product_id = p.id
		 WHERE c.user_id = $1
		 ORDER BY ci.created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []CartItem{}
	for rows.Next() {
		var it CartItem
		if err := rows.Scan(&it.ID, &it.ProductID, &it.Slug, &it.Name, &it.Quantity,
			&it.UnitPriceSnapshot, &it.CurrentPrice, &it.Status, &it.Available, &it.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

// AddCartItem validates product purchasability then inserts/merges the line
// inside one transaction. Price snapshot always reflects the current price.
func (s *Store) AddCartItem(ctx context.Context, userID, productID string, quantity int) (CartItem, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return CartItem{}, err
	}
	defer tx.Rollback(ctx)

	var status string
	var price float64
	err = tx.QueryRow(ctx,
		`SELECT status, price FROM commerce.products WHERE id = $1`, productID).
		Scan(&status, &price)
	if errors.Is(err, pgx.ErrNoRows) {
		return CartItem{}, ErrProductNotFound
	}
	if err != nil {
		return CartItem{}, err
	}
	if status != "ACTIVE" {
		return CartItem{}, ErrProductInactive
	}

	var cartID string
	err = tx.QueryRow(ctx,
		`INSERT INTO commerce.carts (user_id) VALUES ($1)
		 ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
		 RETURNING id`, userID).Scan(&cartID)
	if err != nil {
		return CartItem{}, err
	}

	var it CartItem
	err = tx.QueryRow(ctx,
		`INSERT INTO commerce.cart_items (cart_id, product_id, quantity, unit_price_snapshot)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (cart_id, product_id)
		 DO UPDATE SET quantity = commerce.cart_items.quantity + EXCLUDED.quantity,
		               unit_price_snapshot = EXCLUDED.unit_price_snapshot
		 RETURNING id, product_id, quantity, unit_price_snapshot`,
		cartID, productID, quantity, price).
		Scan(&it.ID, &it.ProductID, &it.Quantity, &it.UnitPriceSnapshot)
	if err != nil {
		return CartItem{}, err
	}

	return it, tx.Commit(ctx)
}

// UpdateCartItem changes quantity with an ownership check via join on carts.user_id.
func (s *Store) UpdateCartItem(ctx context.Context, userID, itemID string, quantity int) (*CartItem, error) {
	var it CartItem
	err := s.pool.QueryRow(ctx,
		`UPDATE commerce.cart_items ci SET quantity = $2
		 FROM commerce.carts c
		 WHERE ci.id = $1 AND ci.cart_id = c.id AND c.user_id = $3
		 RETURNING ci.id, ci.product_id, ci.quantity, ci.unit_price_snapshot`,
		itemID, quantity, userID).
		Scan(&it.ID, &it.ProductID, &it.Quantity, &it.UnitPriceSnapshot)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &it, nil
}

// RemoveCartItem deletes a line with the same ownership check.
func (s *Store) RemoveCartItem(ctx context.Context, userID, itemID string) (bool, error) {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM commerce.cart_items ci
		 USING commerce.carts c
		 WHERE ci.id = $1 AND ci.cart_id = c.id AND c.user_id = $2`,
		itemID, userID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
