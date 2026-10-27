package repo

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// ProductInput carries create/update payload for products.
type ProductInput struct {
	SKU         string
	Slug        string
	Name        string
	Description string
	Price       float64
	CompareAt   *float64
	CategoryID  *string
	Status      string
	WeightGrams *int
}

// CreateProduct inserts a product and its zeroed inventory row atomically.
func (s *Store) CreateProduct(ctx context.Context, in ProductInput) (Product, error) {
	var p Product
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return p, err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`INSERT INTO commerce.products
		   (sku, slug, name, description, price, compare_at_price, category_id, status, weight_grams)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 RETURNING id, sku, slug, name, coalesce(description,''), price, compare_at_price,
		           category_id, status, weight_grams, created_at, updated_at`,
		in.SKU, in.Slug, in.Name, in.Description, in.Price, in.CompareAt,
		in.CategoryID, in.Status, in.WeightGrams).
		Scan(&p.ID, &p.SKU, &p.Slug, &p.Name, &p.Description, &p.Price, &p.CompareAt,
			&p.CategoryID, &p.Status, &p.WeightGrams, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return p, err
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO commerce.inventory (product_id, available_quantity, reserved_quantity, sold_quantity)
		 VALUES ($1, 0, 0, 0)`, p.ID)
	if err != nil {
		return p, err
	}

	if err := tx.Commit(ctx); err != nil {
		return p, err
	}
	s.invalidateCatalog(ctx)
	return p, nil
}

// UpdateProduct applies a partial update. Zero-value fields are ignored.
func (s *Store) UpdateProduct(ctx context.Context, id string, in ProductInput) (*Product, error) {
	var p Product
	err := s.pool.QueryRow(ctx,
		`UPDATE commerce.products SET
		   name        = coalesce(nullif($2,''), name),
		   description = coalesce($3, description),
		   price       = coalesce($4, price),
		   compare_at_price = coalesce($5, compare_at_price),
		   category_id = coalesce($6, category_id),
		   status      = coalesce(nullif($7,''), status),
		   weight_grams = coalesce($8, weight_grams),
		   updated_at  = now()
		 WHERE id = $1
		 RETURNING id, sku, slug, name, coalesce(description,''), price, compare_at_price,
		           category_id, status, weight_grams, created_at, updated_at`,
		id, in.Name, in.Description, in.Price, in.CompareAt, in.CategoryID,
		in.Status, in.WeightGrams).
		Scan(&p.ID, &p.SKU, &p.Slug, &p.Name, &p.Description, &p.Price, &p.CompareAt,
			&p.CategoryID, &p.Status, &p.WeightGrams, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err == nil {
		s.invalidateCatalog(ctx)
	}
	return &p, err
}

// GetProductByID fetches a product by id (admin/detail use).
func (s *Store) GetProductByID(ctx context.Context, id string) (*Product, error) {
	var p Product
	err := s.pool.QueryRow(ctx,
		`SELECT id, sku, slug, name, coalesce(description,''), price, compare_at_price,
		        category_id, status, weight_grams, created_at, updated_at
		 FROM commerce.products WHERE id = $1`, id).
		Scan(&p.ID, &p.SKU, &p.Slug, &p.Name, &p.Description, &p.Price, &p.CompareAt,
			&p.CategoryID, &p.Status, &p.WeightGrams, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &p, err
}

// ArchiveProduct soft-deletes by flipping status to ARCHIVED.
func (s *Store) ArchiveProduct(ctx context.Context, id string) (bool, error) {
	tag, err := s.pool.Exec(ctx,
		`UPDATE commerce.products SET status = 'ARCHIVED', updated_at = now()
		 WHERE id = $1 AND status <> 'ARCHIVED'`, id)
	if err != nil {
		return false, err
	}
	if tag.RowsAffected() > 0 {
		s.invalidateCatalog(ctx)
	}
	return tag.RowsAffected() > 0, nil
}

// CreateCategory inserts a category.
func (s *Store) CreateCategory(ctx context.Context, name, slug string, parentID *string) (Category, error) {
	var c Category
	err := s.pool.QueryRow(ctx,
		`INSERT INTO commerce.categories (name, slug, parent_id, status)
		 VALUES ($1,$2,$3,'ACTIVE')
		 RETURNING id, name, slug, parent_id, status, created_at`,
		name, slug, parentID).
		Scan(&c.ID, &c.Name, &c.Slug, &c.ParentID, &c.Status, &c.CreatedAt)
	if err == nil {
		s.invalidateCatalog(ctx)
	}
	return c, err
}

// UpdateCategory renames a category or moves it in the hierarchy.
func (s *Store) UpdateCategory(ctx context.Context, id, name string, parentID *string) (*Category, error) {
	var c Category
	err := s.pool.QueryRow(ctx,
		`UPDATE commerce.categories SET
		   name      = coalesce(nullif($2,''), name),
		   parent_id = $3
		 WHERE id = $1
		 RETURNING id, name, slug, parent_id, status, created_at`,
		id, name, parentID).
		Scan(&c.ID, &c.Name, &c.Slug, &c.ParentID, &c.Status, &c.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err == nil {
		s.invalidateCatalog(ctx)
	}
	return &c, err
}

// AdjustInventory applies a signed delta and writes an audit log row atomically.
// The CHECK constraint on available_quantity is the final guard against
// negative stock; a violation surfaces as an error the handler maps to 409.
func (s *Store) AdjustInventory(ctx context.Context, productID string, delta int, reason string, actorID string) (*Inventory, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var inv Inventory
	err = tx.QueryRow(ctx,
		`UPDATE commerce.inventory
		   SET available_quantity = available_quantity + $2, updated_at = now()
		 WHERE product_id = $1
		 RETURNING product_id, available_quantity, reserved_quantity, sold_quantity, updated_at`,
		productID, delta).
		Scan(&inv.ProductID, &inv.AvailableQuantity, &inv.ReservedQuantity, &inv.SoldQuantity, &inv.UpdatedAt)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO commerce.audit_logs (actor_id, actor_role, action, resource_type, resource_id, metadata)
		 VALUES ($1, 'ADMIN', 'INVENTORY_ADJUSTED', 'inventory', $2, $3)`,
		actorID, productID, reason)
	if err != nil {
		return nil, err
	}

	return &inv, tx.Commit(ctx)
}

// ArchiveCategory deactivates a category (products keep their history).
func (s *Store) ArchiveCategory(ctx context.Context, id string) (bool, error) {
	tag, err := s.pool.Exec(ctx,
		`UPDATE commerce.categories SET status = 'INACTIVE' WHERE id = $1 AND status = 'ACTIVE'`, id)
	if err != nil {
		return false, err
	}
	if tag.RowsAffected() > 0 {
		s.invalidateCatalog(ctx)
	}
	return tag.RowsAffected() > 0, nil
}
