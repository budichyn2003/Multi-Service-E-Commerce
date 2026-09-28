package com.marketforge.order.service;

import com.marketforge.order.domain.OrderItem;
import com.marketforge.order.service.exception.InsufficientInventoryException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Synchronous REST client to the Go commerce service (ADR-007: needs an
 * immediate answer before an order may be persisted).
 */
@Component
public class CommerceClient {

  private final RestClient rest;

  public CommerceClient(@Value("${marketforge.commerce-url}") String baseUrl) {
    this.rest = RestClient.builder().baseUrl(baseUrl).build();
  }

  public void reserveInventory(String orderToken, List<OrderItem> items) {
    List<Map<String, Object>> payload =
        items.stream()
            .map(i -> Map.<String, Object>of(
                "productId", i.getProductId().toString(),
                "quantity", i.getQuantity()))
            .toList();

    var response = rest.post()
        .uri("/api/v1/inventory/reserve")
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("orderId", orderToken, "items", payload))
        .retrieve()
        .onStatus(
            status -> status.isSameCodeAs(HttpStatus.CONFLICT),
            (req, res) -> { throw new InsufficientInventoryException("insufficient inventory"); })
        .toBodilessEntity();

    if (response.getStatusCode().is2xxSuccessful()) {
      return;
    }
    throw new IllegalStateException("Unexpected reservation response: " + response.getStatusCode());
  }
}
