package com.marketforge.order.domain;

import java.util.Map;
import java.util.Set;

/** Order lifecycle state machine. Illegal transitions throw in the domain. */
public enum OrderStatus {
  PENDING_PAYMENT,
  PAID,
  PROCESSING,
  SHIPPED,
  DELIVERED,
  CANCELLED,
  EXPIRED;

  private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
      PENDING_PAYMENT, Set.of(PAID, CANCELLED, EXPIRED),
      PAID, Set.of(PROCESSING, CANCELLED),
      PROCESSING, Set.of(SHIPPED, CANCELLED),
      SHIPPED, Set.of(DELIVERED),
      DELIVERED, Set.of(),
      CANCELLED, Set.of(),
      EXPIRED, Set.of());

  public boolean canTransitionTo(OrderStatus target) {
    return ALLOWED.getOrDefault(this, Set.of()).contains(target);
  }
}
