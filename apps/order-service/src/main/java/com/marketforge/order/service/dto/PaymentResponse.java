package com.marketforge.order.service.dto;

import com.marketforge.order.domain.Payment;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
    UUID id,
    UUID orderId,
    String status,
    String provider,
    BigDecimal amount,
    String currency,
    String checkoutUrl,
    Instant expiresAt,
    Instant paidAt) {

  public static PaymentResponse from(Payment payment, String checkoutUrl) {
    return new PaymentResponse(
        payment.getId(), payment.getOrderId(), payment.getStatus(), payment.getProvider(),
        payment.getAmount(), payment.getCurrency(), checkoutUrl, payment.getExpiresAt(),
        payment.getPaidAt());
  }
}
