package repo

import (
	"errors"
	"strconv"
	"strings"
)

// Small helpers kept separate to keep store.go focused on queries.

func itoa(n int) string { return strconv.Itoa(n) }

func join(parts []string, sep string) string { return strings.Join(parts, sep) }

func errorsIs(err, target error) bool { return errors.Is(err, target) }
