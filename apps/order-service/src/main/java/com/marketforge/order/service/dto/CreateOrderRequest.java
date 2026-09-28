package com.marketforge.order.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
    @NotNull UUID userId,
    @NotEmpty @Valid List<Line> items,
    String shippingAddressJson) {

  public record Line(
      @NotNull UUID productId,
      @NotBlank String sku,
      @NotBlank String name,
      @NotNull @DecimalMin("0.00") BigDecimal unitPrice,
      @NotNull @Min(1) Integer quantity) {}

  /**
   * Correlation token sent to the commerce service as the reservation order
   * reference. Must be a UUID; Phase 4 replaces this with the pending order id.
   */
  public String orderIdToken() {
    return UUID.randomUUID().toString();
  }
}
