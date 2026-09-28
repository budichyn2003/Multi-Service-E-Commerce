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

  @PostMapping("/orders")
  public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateOrderRequest request) {
    OrderResponse created = orderService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(Map.of("success", true, "data", created));
  }

  @GetMapping("/orders/{orderNumber}")
  public Map<String, Object> get(@PathVariable String orderNumber) {
    return Map.of("success", true, "data", orderService.getByOrderNumber(orderNumber));
  }

  @PostMapping("/orders/{orderNumber}/status")
  public Map<String, Object> transition(@PathVariable String orderNumber,
      @RequestBody Map<String, String> body) {
    OrderStatus target = OrderStatus.valueOf(body.getOrDefault("status", "").toUpperCase());
    OrderResponse updated = orderService.transition(
        orderNumber, target,
        body.getOrDefault("reason", ""),
        body.getOrDefault("actorType", "SYSTEM"),
        null);
    return Map.of("success", true, "data", updated);
  }

  @GetMapping("/orders/{orderNumber}/history")
  public Map<String, Object> history(@PathVariable String orderNumber) {
    var order = orderService.getByOrderNumber(orderNumber);
    List<OrderHistory> entries = historyRepo.findByOrderIdOrderByCreatedAtAsc(order.id());
    return Map.of("success", true, "data", entries);
  }
}
