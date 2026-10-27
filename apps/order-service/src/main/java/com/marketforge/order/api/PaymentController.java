package com.marketforge.order.api;

import com.marketforge.order.service.PaymentService;
import com.marketforge.order.service.dto.PaymentResponse;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class PaymentController {

  private final PaymentService payments;

  public PaymentController(PaymentService payments) {
    this.payments = payments;
  }

  @PostMapping("/orders/{orderNumber}/payments")
  public ResponseEntity<Map<String, Object>> create(@PathVariable String orderNumber) {
    PaymentResponse payment = payments.create(orderNumber);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(Map.of("success", true, "data", payment));
  }

  @GetMapping("/payments/{paymentId}")
  public Map<String, Object> get(@PathVariable UUID paymentId) {
    return Map.of("success", true, "data", payments.get(paymentId));
  }

}
