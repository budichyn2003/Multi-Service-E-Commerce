package repo

import "context"

// Ping verifies database connectivity for the readiness probe.
func (s *Store) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}
