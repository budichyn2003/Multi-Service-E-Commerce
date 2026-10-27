package com.marketforge.order.service;

import com.marketforge.order.domain.OrderItem;
import com.marketforge.order.service.dto.CreateOrderRequest;
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
  private final String internalToken;

  public CommerceClient(
      @Value("${marketforge.commerce-url}") String baseUrl,
      @Value("${marketforge.internal-token}") String internalToken) {
    this.rest = RestClient.builder().baseUrl(baseUrl).build();
    this.internalToken = internalToken;
  }

  public List<ProductQuote> quoteProducts(List<CreateOrderRequest.Line> items) {
    List<Map<String, Object>> payload =
        items.stream()
            .map(i -> Map.<String, Object>of(
                "productId", i.productId().toString(), "quantity", i.quantity()))
            .toList();
    QuoteEnvelope response = rest.post()
        .uri("/api/v1/internal/products/quote")
        .header("X-Internal-Token", internalToken)
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("items", payload))
        .retrieve()
        .body(QuoteEnvelope.class);
    if (response == null || response.data() == null || response.data().items() == null ||
        response.data().items().isEmpty()) {
      throw new IllegalStateException("Commerce service returned an empty product quote");
    }
    return response.data().items();
  }

  public void reserveInventory(String orderId, List<OrderItem> items) {
    List<Map<String, Object>> payload =
        items.stream()
            .map(i -> Map.<String, Object>of(
                "productId", i.getProductId().toString(),
                "quantity", i.getQuantity()))
            .toList();

    var response = rest.post()
        .uri("/api/v1/inventory/reserve")
        .header("X-Internal-Token", internalToken)
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("orderId", orderId, "items", payload))
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

  public void confirmReservation(String orderId) {
    transitionReservation(orderId, "confirm");
  }

  public void releaseReservation(String orderId) {
    transitionReservation(orderId, "release");
  }

  private void transitionReservation(String orderId, String action) {
    rest.post()
        .uri("/api/v1/internal/inventory/{orderId}/{action}", orderId, action)
        .header("X-Internal-Token", internalToken)
        .retrieve()
        .toBodilessEntity();
  }

  public record ProductQuote(String productId, String sku, String name, BigDecimal unitPrice, int quantity) {}
  private record QuoteEnvelope(boolean success, QuoteData data) {}
  private record QuoteData(List<ProductQuote> items) {}
}
