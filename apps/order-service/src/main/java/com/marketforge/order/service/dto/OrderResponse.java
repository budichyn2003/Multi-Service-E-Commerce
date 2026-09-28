package com.marketforge.order.service.dto;

import com.marketforge.order.domain.Order;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    String orderNumber,
    UUID userId,
    String status,
    BigDecimal subtotal,
    BigDecimal discountAmount,
    BigDecimal shippingAmount,
    BigDecimal totalAmount,
    String currency,
    Instant createdAt,
    List<Item> items) {

  public record Item(UUID productId, String sku, String name, BigDecimal unitPrice, int quantity,
                     BigDecimal subtotal) {}

  public static OrderResponse from(Order o) {
    List<Item> items = o.getItems().stream()
        .map(i -> new Item(i.getProductId(), i.getSkuSnapshot(), i.getProductNameSnapshot(),
            i.getUnitPrice(), i.getQuantity(), i.getSubtotal()))
        .toList();
    return new OrderResponse(
        o.getId(), o.getOrderNumber(), o.getUserId(), o.getStatus().name(),
        o.getSubtotal(), o.getDiscountAmount(), o.getShippingAmount(), o.getTotalAmount(),
        o.getCurrency(), o.getCreatedAt(), items);
  }
}
