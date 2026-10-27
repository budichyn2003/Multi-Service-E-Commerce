package com.marketforge.order.api;

import com.marketforge.order.service.PaymentService;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@ConditionalOnProperty(name = "marketforge.payment.simulation-enabled", havingValue = "true")
public class MockPaymentController {

  private final PaymentService payments;

  public MockPaymentController(PaymentService payments) {
    this.payments = payments;
  }

  @PostMapping("/{paymentId}/simulate-success")
  public Map<String, Object> simulateSuccess(@PathVariable UUID paymentId) {
    return Map.of("success", true, "data", payments.simulateSuccess(paymentId));
  }
}
