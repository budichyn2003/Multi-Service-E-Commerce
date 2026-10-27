package com.marketforge.order.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
    @NotNull UUID userId,
    @NotEmpty @Valid List<Line> items,
    String shippingAddressJson) {

  public record Line(
      @NotNull UUID productId,
      @NotNull @Min(1) @Max(999) Integer quantity) {}
}
