package com.marketforge.order.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
    UUID userId,
    @NotEmpty @Valid List<Line> items,
    String shippingAddressJson) {

  public CreateOrderRequest withUserId(UUID newUserId) {
    return new CreateOrderRequest(newUserId, this.items, this.shippingAddressJson);
  }

  public record Line(
      @NotNull UUID productId,
      @NotNull @Min(1) @Max(999) Integer quantity) {}
}
