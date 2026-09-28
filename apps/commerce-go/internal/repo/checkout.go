package repo

import (
	"context"
	"time"
)

// CheckoutLine is a priced, validated cart line at checkout time.
type CheckoutLine struct {
	ProductID string  `json:"productId"`
	SKU       string  `json:"sku"`
	Name      string  `json:"name"`
	UnitPrice float64 `json:"unitPrice"`
	Quantity  int     `json:"quantity"`
	Subtotal  float64 `json:"subtotal"`
}

// CheckoutResult is the server-calculated checkout summary. Prices are always
// recomputed here — frontend totals are advisory only (requirements §22).
type CheckoutResult struct {
	Lines     []CheckoutLine `json:"lines"`
	Subtotal  float64        `json:"subtotal"`
	Shipping  float64        `json:"shipping"`
	Total     float64        `json:"total"`
	Reference string         `json:"reference"`
}

// CheckoutErrors aggregates every cart problem so the client can fix all of
// them in one round trip instead of one per attempt.
type CheckoutErrors struct {
	Problems []string
}

func (e *CheckoutErrors) Error() string {
	if len(e.Problems) == 0 {
		return "checkout validation failed"
	}
	return e.Problems[0]
}

// ValidateAndReserve runs the full server-side checkout validation against the
// customer's cart, then reserves inventory — all in ONE transaction with
// row-locked conditional updates (overselling impossible, requirements §52).
// Returns the priced summary on success.
func (s *Store) ValidateAndReserve(ctx context.Context, userID, reference string, ttl time.Duration) (*CheckoutResult, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Lock the customer's cart rows alongside catalog + inventory state.
	rows, err := tx.Query(ctx,
		`SELECT ci.product_id, p.sku, p.name, p.price, p.status, ci.quantity,
		        coalesce(i.available_quantity, 0)
		 FROM commerce.cart_items ci
		 JOIN commerce.carts c    ON c.id = ci.cart_id
		 JOIN commerce.products p ON p.id = ci.product_id
		 LEFT JOIN commerce.inventory i ON i.product_id = p.id
		 WHERE c.user_id = $1
		 ORDER BY ci.created_at
		 FOR UPDATE OF p`, userID)
	if err != nil {
		return nil, err
	}
	type rawLine struct {
		productID, sku, name, status string
		price                        float64
		quantity, available          int
	}
	var raws []rawLine
	for rows.Next() {
		var l rawLine
		if err := rows.Scan(&l.productID, &l.sku, &l.name, &l.price, &l.status,
			&l.quantity, &l.available); err != nil {
			rows.Close()
			return nil, err
		}
		raws = append(raws, l)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	if len(raws) == 0 {
		return nil, &CheckoutErrors{Problems: []string{"cart is empty"}}
	}

	// Validate status + stock against CURRENT catalog state.
	problems := []string{}
	lines := make([]CheckoutLine, 0, len(raws))
	subtotal := 0.0
	for _, l := range raws {
		if l.status != "ACTIVE" {
			problems = append(problems, l.sku+": product is not purchasable ("+l.status+")")
			continue
		}
		if l.available < l.quantity {
			problems = append(problems, l.sku+": insufficient stock")
			continue
		}
		lineSub := round2(l.price * float64(l.quantity))
		subtotal += lineSub
		lines = append(lines, CheckoutLine{
			ProductID: l.productID, SKU: l.sku, Name: l.name,
			UnitPrice: l.price, Quantity: l.quantity, Subtotal: lineSub,
		})
	}
	if len(problems) > 0 {
		return nil, &CheckoutErrors{Problems: problems}
	}

	shipping := 0.0
	if subtotal > 0 {
		shipping = 10000
	}
	total := round2(subtotal + shipping)

	// Reserve each line atomically; conditional UPDATE + row lock guarantee
	// available_quantity never goes negative even under concurrent checkouts.
	for _, l := range lines {
		tag, err := tx.Exec(ctx,
			`UPDATE commerce.inventory
			   SET reserved_quantity = reserved_quantity + $2,
			       available_quantity = available_quantity - $2,
			       updated_at = now()
			 WHERE product_id = $1 AND available_quantity >= $2`,
			l.ProductID, l.Quantity)
		if err != nil {
			return nil, err
		}
		if tag.RowsAffected() == 0 {
			return nil, &CheckoutErrors{Problems: []string{l.SKU + ": insufficient stock (race)"}}
		}
		_, err = tx.Exec(ctx,
			`INSERT INTO commerce.reservations (order_id, product_id, quantity, status, expires_at)
			 VALUES ($1, $2, $3, 'ACTIVE', now() + $4)`,
			reference, l.ProductID, l.Quantity, ttl)
		if err != nil {
			return nil, err
		}
	}

	// Empty the cart after successful reservation.
	if _, err := tx.Exec(ctx,
		`DELETE FROM commerce.cart_items
		 WHERE cart_id IN (SELECT id FROM commerce.carts WHERE user_id = $1)`, userID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &CheckoutResult{
		Lines: lines, Subtotal: round2(subtotal),
		Shipping: shipping, Total: total, Reference: reference,
	}, nil
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
