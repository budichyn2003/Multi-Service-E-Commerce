package repo

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"github.com/jackc/pgx/v5"
)

const (
	ReservationActive    = "ACTIVE"
	ReservationConfirmed = "CONFIRMED"
	ReservationReleased  = "RELEASED"
)

var (
	ErrReservationNotFound = errors.New("reservation not found")
	ErrReservationConflict = errors.New("reservation is not in a transitionable state")
)

type ProductQuote struct {
	ProductID string  `json:"productId"`
	SKU       string  `json:"sku"`
	Name      string  `json:"name"`
	UnitPrice float64 `json:"unitPrice"`
	Quantity  int     `json:"quantity"`
}

func (s *Store) QuoteProducts(ctx context.Context, requested []ReserveInput) ([]ProductQuote, error) {
	normalized := AggregateReserveItems(requested)

	quotes := make([]ProductQuote, 0, len(normalized))
	for _, item := range normalized {
		id := item.ProductID
		var quote ProductQuote
		var status string
		err := s.pool.QueryRow(ctx,
			`SELECT id, sku, name, price, status FROM commerce.products WHERE id = $1`, id).
			Scan(&quote.ProductID, &quote.SKU, &quote.Name, &quote.UnitPrice, &status)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductNotFound
		}
		if err != nil {
			return nil, err
		}
		if status != "ACTIVE" {
			return nil, fmt.Errorf("%w: %s", ErrProductInactive, quote.SKU)
		}
		quote.Quantity = item.Quantity
		quotes = append(quotes, quote)
	}
	return quotes, nil
}

func (s *Store) TransitionReservations(ctx context.Context, orderID, target string) error {
	if target != ReservationConfirmed && target != ReservationReleased {
		return fmt.Errorf("unsupported reservation state %q", target)
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, orderID); err != nil {
		return err
	}

	rows, err := tx.Query(ctx,
		`SELECT product_id, quantity, status
		 FROM commerce.reservations WHERE order_id = $1
		 ORDER BY product_id FOR UPDATE`, orderID)
	if err != nil {
		return err
	}
	type reservation struct {
		quantity   int
		activeRows int
	}
	reservations := make(map[string]reservation)
	found := false
	for rows.Next() {
		var productID, status string
		var quantity int
		if err := rows.Scan(&productID, &quantity, &status); err != nil {
			rows.Close()
			return err
		}
		found = true
		if status == target {
			continue
		}
		if status != ReservationActive {
			rows.Close()
			return ErrReservationConflict
		}
		item := reservations[productID]
		item.quantity += quantity
		item.activeRows++
		reservations[productID] = item
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()
	if !found {
		return ErrReservationNotFound
	}
	if len(reservations) == 0 {
		return tx.Commit(ctx)
	}

	productIDs := make([]string, 0, len(reservations))
	for id := range reservations {
		productIDs = append(productIDs, id)
	}
	sort.Strings(productIDs)
	for _, productID := range productIDs {
		item := reservations[productID]
		if target == ReservationConfirmed {
			stockTag, updateErr := tx.Exec(ctx,
				`UPDATE commerce.inventory
				 SET reserved_quantity = reserved_quantity - $2,
				     sold_quantity = sold_quantity + $2, updated_at = now()
				 WHERE product_id = $1 AND reserved_quantity >= $2`,
				productID, item.quantity)
			if updateErr != nil {
				return updateErr
			}
			if stockTag.RowsAffected() == 0 {
				return ErrReservationConflict
			}
		} else {
			stockTag, updateErr := tx.Exec(ctx,
				`UPDATE commerce.inventory
				 SET reserved_quantity = reserved_quantity - $2,
				     available_quantity = available_quantity + $2, updated_at = now()
				 WHERE product_id = $1 AND reserved_quantity >= $2`,
				productID, item.quantity)
			if updateErr != nil {
				return updateErr
			}
			if stockTag.RowsAffected() == 0 {
				return ErrReservationConflict
			}
		}
		tag, err := tx.Exec(ctx,
			`UPDATE commerce.reservations SET status = $2
			 WHERE order_id = $1 AND product_id = $3 AND status = 'ACTIVE'`,
			orderID, target, productID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() != int64(item.activeRows) {
			return ErrReservationConflict
		}
	}
	return tx.Commit(ctx)
}
