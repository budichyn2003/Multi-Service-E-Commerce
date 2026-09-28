package com.marketforge.order.domain;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class OrderStatusTest {

  @Test
  void pendingPaymentCanTransitionToPaidCancelledOrExpired() {
    assertTrue(OrderStatus.PENDING_PAYMENT.canTransitionTo(OrderStatus.PAID));
    assertTrue(OrderStatus.PENDING_PAYMENT.canTransitionTo(OrderStatus.CANCELLED));
    assertTrue(OrderStatus.PENDING_PAYMENT.canTransitionTo(OrderStatus.EXPIRED));
  }

  @Test
  void deliveredIsTerminal() {
    assertFalse(OrderStatus.DELIVERED.canTransitionTo(OrderStatus.PENDING_PAYMENT));
    assertFalse(OrderStatus.DELIVERED.canTransitionTo(OrderStatus.CANCELLED));
  }

  @Test
  void paidCannotGoBackToPending() {
    assertThrows(IllegalStateException.class, () -> {
      // direct transition table check happens in the domain; simulate rejection
      if (!OrderStatus.PAID.canTransitionTo(OrderStatus.PENDING_PAYMENT)) {
        throw new IllegalStateException("Illegal transition PAID -> PENDING_PAYMENT");
      }
    });
  }
}
