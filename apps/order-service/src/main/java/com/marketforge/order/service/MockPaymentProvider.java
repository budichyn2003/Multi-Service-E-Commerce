package com.marketforge.order.service;

import com.marketforge.order.domain.Payment;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "marketforge.payment.provider", havingValue = "mock", matchIfMissing = true)
public class MockPaymentProvider implements PaymentProvider {

  private final String checkoutBaseUrl;

  public MockPaymentProvider(
      @Value("${marketforge.payment.mock-checkout-base-url:http://localhost:3000/payments/mock}") String checkoutBaseUrl) {
    this.checkoutBaseUrl = checkoutBaseUrl.replaceAll("/+$", "");
  }

  @Override
  public String name() {
    return "mock";
  }

  @Override
  public String createSession(Payment payment) {
    return "mock-" + payment.getId();
  }

  @Override
  public String checkoutUrl(UUID paymentId) {
    return checkoutBaseUrl + "/" + paymentId;
  }
}
