package com.marketforge.order.service;

import com.marketforge.order.domain.Payment;
import java.util.UUID;

public interface PaymentProvider {
  String name();
  String createSession(Payment payment);
  String checkoutUrl(UUID paymentId);
}
