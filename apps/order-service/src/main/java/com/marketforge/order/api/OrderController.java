package com.marketforge.order.api;

import com.marketforge.order.domain.OrderHistory;
import com.marketforge.order.domain.OrderStatus;
import com.marketforge.order.repo.OrderHistoryRepository;
import com.marketforge.order.service.OrderService;
import com.marketforge.order.service.dto.CreateOrderRequest;
import com.marketforge.order.service.dto.OrderResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class OrderController {

  private final OrderService orderService;
  private final OrderHistoryRepository historyRepo;

  public OrderController(OrderService orderService, OrderHistoryRepository historyRepo) {
    this.orderService = orderService;
    this.historyRepo = historyRepo;
  }

  @GetMapping("/orders")
  public Map<String, Object> list(
      @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
      @RequestHeader(value = "X-User-Role", required = false) String headerUserRole,
      @RequestParam(value = "userId", required = false) UUID queryUserId) {
    boolean isAdmin = "ADMIN".equalsIgnoreCase(headerUserRole);
    UUID effectiveUserId = null;
    if (isAdmin && queryUserId != null) {
      effectiveUserId = queryUserId;
    } else if (headerUserId != null && !headerUserId.isBlank()) {
      try {
        effectiveUserId = UUID.fromString(headerUserId);
      } catch (Exception ignored) {}
    } else if (queryUserId != null) {
      effectiveUserId = queryUserId;
    }

    List<OrderResponse> result = orderService.listOrders(effectiveUserId, isAdmin);
    return Map.of("success", true, "data", result);
  }

  @PostMapping("/orders")
  public ResponseEntity<Map<String, Object>> create(
      @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
      @Valid @RequestBody CreateOrderRequest request) {
    CreateOrderRequest effective = request;
    if (request.userId() == null && headerUserId != null && !headerUserId.isBlank()) {
      try {
        effective = request.withUserId(UUID.fromString(headerUserId));
      } catch (Exception ignored) {}
    }
    OrderResponse created = orderService.create(effective);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(Map.of("success", true, "data", created));
  }

  @GetMapping("/orders/{orderNumber}")
  public Map<String, Object> get(@PathVariable String orderNumber) {
    return Map.of("success", true, "data", orderService.getByOrderNumber(orderNumber));
  }

  @PostMapping("/orders/{orderNumber}/cancel")
  public Map<String, Object> cancel(
      @PathVariable String orderNumber,
      @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
      @RequestHeader(value = "X-User-Role", required = false) String headerUserRole,
      @RequestBody(required = false) Map<String, String> body) {
    UUID actorId = null;
    if (headerUserId != null && !headerUserId.isBlank()) {
      try {
        actorId = UUID.fromString(headerUserId);
      } catch (Exception ignored) {}
    }
    String actorType = "ADMIN".equalsIgnoreCase(headerUserRole) ? "ADMIN" : "CUSTOMER";
    String reason = body != null ? body.getOrDefault("reason", "order cancelled by customer") : "order cancelled";
    OrderResponse updated = orderService.cancel(orderNumber, reason, actorType, actorId);
    return Map.of("success", true, "data", updated);
  }

  @PostMapping("/orders/{orderNumber}/status")
  public Map<String, Object> transition(
      @PathVariable String orderNumber,
      @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
      @RequestHeader(value = "X-User-Role", required = false) String headerUserRole,
      @RequestBody Map<String, String> body) {
    OrderStatus target = OrderStatus.valueOf(body.getOrDefault("status", "").toUpperCase());
    UUID actorId = null;
    if (headerUserId != null && !headerUserId.isBlank()) {
      try {
        actorId = UUID.fromString(headerUserId);
      } catch (Exception ignored) {}
    }
    String actorType = body.getOrDefault("actorType", "ADMIN".equalsIgnoreCase(headerUserRole) ? "ADMIN" : "SYSTEM");
    OrderResponse updated = orderService.transition(
        orderNumber, target,
        body.getOrDefault("reason", ""),
        actorType,
        actorId);
    return Map.of("success", true, "data", updated);
  }

  @GetMapping("/orders/{orderNumber}/history")
  public Map<String, Object> history(@PathVariable String orderNumber) {
    var order = orderService.getByOrderNumber(orderNumber);
    List<OrderHistory> entries = historyRepo.findByOrderIdOrderByCreatedAtAsc(order.id());
    return Map.of("success", true, "data", entries);
  }
}
