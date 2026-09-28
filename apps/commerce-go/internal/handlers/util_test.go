package handlers

import "testing"

func TestIsValidUUID(t *testing.T) {
	valid := []string{
		"123e4567-e89b-12d3-a456-426614174000",
		"123E4567-E89B-12D3-A456-426614174000",
	}
	invalid := []string{
		"", "not-a-uuid", "123e4567e89b12d3a456426614174000",
		"123e4567-e89b-12d3-a456-42661417400",       // too short
		"123e4567-e89b-12d3-a456-4266141740000",     // too long
		"customer1-1727435298123456789",             // order-service legacy token format
	}
	for _, s := range valid {
		if !isValidUUID(s) {
			t.Errorf("expected %q to be valid", s)
		}
	}
	for _, s := range invalid {
		if isValidUUID(s) {
			t.Errorf("expected %q to be invalid", s)
		}
	}
}

func TestParsePrice(t *testing.T) {
	if _, err := parsePrice("-1"); err == nil {
		t.Fatal("expected negative price to fail")
	}
	if f, err := parsePrice("12.50"); err != nil || f != 12.50 {
		t.Fatalf("expected 12.50, got %v err %v", f, err)
	}
}
