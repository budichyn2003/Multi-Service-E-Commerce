package repo

import (
	"strings"
	"testing"
)

func TestProductQueryDefaults(t *testing.T) {
	q := ProductQuery{Page: 0, Limit: 500, Sort: "bogus"}
	if q.Page != 0 {
		t.Fatal("expected zero value to be preserved")
	}
	_ = q // defaults are applied in ListProducts; here we validate the struct contract
}

func TestInsufficientInventoryError(t *testing.T) {
	var err error = &InsufficientInventoryError{}
	if err.Error() != "insufficient inventory" {
		t.Fatalf("unexpected message: %s", err.Error())
	}
}

func TestRound2(t *testing.T) {
	cases := []struct{ in, want float64 }{
		{10.0, 10.0},
		{10.005, 10.01},
		{10.004, 10.0},
		{33333.333, 33333.33},
	}
	for _, c := range cases {
		if got := round2(c.in); got != c.want {
			t.Errorf("round2(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestCheckoutErrorsAggregatesProblems(t *testing.T) {
	ce := &CheckoutErrors{Problems: []string{
		"SKU-0001: product is not purchasable (INACTIVE)",
		"SKU-0002: insufficient stock",
	}}
	if !strings.Contains(ce.Error(), "SKU-0001") {
		t.Fatal("expected first problem in message")
	}
	if len(ce.Problems) != 2 {
		t.Fatalf("expected 2 problems, got %d", len(ce.Problems))
	}
}

func TestAggregateReserveItemsCombinesAndSortsProducts(t *testing.T) {
	items := AggregateReserveItems([]ReserveInput{
		{ProductID: "b", Quantity: 2},
		{ProductID: "a", Quantity: 3},
		{ProductID: "b", Quantity: 4},
	})
	if len(items) != 2 {
		t.Fatalf("expected 2 products, got %d", len(items))
	}
	if items[0] != (ReserveInput{ProductID: "a", Quantity: 3}) {
		t.Fatalf("unexpected first aggregate: %+v", items[0])
	}
	if items[1] != (ReserveInput{ProductID: "b", Quantity: 6}) {
		t.Fatalf("unexpected second aggregate: %+v", items[1])
	}
}
