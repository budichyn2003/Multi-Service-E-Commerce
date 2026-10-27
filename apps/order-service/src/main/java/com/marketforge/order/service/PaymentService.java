package com.marketforge.order.service;

import com.marketforge.order.domain.Payment;
import com.marketforge.order.repo.OrderRepository;
import com.marketforge.order.repo.PaymentRepository;
import com.marketforge.order.service.dto.OrderResponse;
import com.marketforge.order.service.dto.PaymentResponse;
import com.marketforge.order.service.exception.NotFoundException;
import com.marketforge.order.service.exception.PaymentConflictException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

  private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
  private final PaymentRepository payments;
  private final OrderRepository orders;
  private final OrderService orderService;
  private final CommerceClient commerce;
  private final PaymentProvider provider;

  public PaymentService(
      PaymentRepository payments,
      OrderRepository orders,
      OrderService orderService,
      CommerceClient commerce,
      PaymentProvider provider) {
    this.payments = payments;
    this.orders = orders;
    this.orderService = orderService;
    this.commerce = commerce;
    this.provider = provider;
  }

  @Transactional
  public PaymentResponse create(String orderNumber) {
    var order = orders.findByOrderNumberForUpdate(orderNumber)
        .orElseThrow(() -> new NotFoundException("Order not found: " + orderNumber));
    if (!"PENDING_PAYMENT".equals(order.getStatus().name())) {
      throw new PaymentConflictException("Order is not awaiting payment");
    }

    var existing = payments.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), "PENDING");
    if (existing.isPresent()) {
      Payment active = existing.get();
      if (active.getExpiresAt().isAfter(Instant.now())) {
        return PaymentResponse.from(active, provider.checkoutUrl(active.getId()));
      }
      throw new PaymentConflictException("The previous payment session expired; wait for its reservation to be released.");
    }

    Instant expiresAt = Instant.now().plus(15, ChronoUnit.MINUTES);
    Payment payment = new Payment(UUID.randomUUID(), order.getId(), order.getTotalAmount(),
        order.getCurrency(), expiresAt);
    payment.setExternalPaymentId(provider.createSession(payment));
    payment = payments.saveAndFlush(payment);
    return PaymentResponse.from(payment, provider.checkoutUrl(payment.getId()));
  }

  @Transactional(readOnly = true)
  public PaymentResponse get(UUID paymentId) {
    Payment payment = payments.findById(paymentId)
        .orElseThrow(() -> new NotFoundException("Payment not found"));
    return PaymentResponse.from(payment, provider.checkoutUrl(payment.getId()));
  }

  @Transactional
  public PaymentResponse simulateSuccess(UUID paymentId) {
    if (!"mock".equals(provider.name())) {
      throw new PaymentConflictException("Payment simulation is available only for the mock provider");
    }
    Payment payment = payments.findByIdForUpdate(paymentId)
        .orElseThrow(() -> new NotFoundException("Payment not found"));
    if ("PAID".equals(payment.getStatus())) {
      return PaymentResponse.from(payment, provider.checkoutUrl(payment.getId()));
    }
    if (!"PENDING".equals(payment.getStatus())) {
      throw new PaymentConflictException("Payment is not pending");
    }
    if (!payment.getExpiresAt().isAfter(Instant.now())) {
      throw new PaymentConflictException("Payment session has expired");
    }

    OrderResponse order = orderService.getByOrderNumber(
        orders.findById(payment.getOrderId())
            .orElseThrow(() -> new NotFoundException("Order not found"))
            .getOrderNumber());
    commerce.confirmReservation(payment.getOrderId().toString());
    if ("PENDING_PAYMENT".equals(order.status())) {
      orderService.transition(order.orderNumber(),
          com.marketforge.order.domain.OrderStatus.PAID,
          "mock sandbox payment succeeded", "SYSTEM", null);
    } else if (!"PAID".equals(order.status())) {
      throw new PaymentConflictException("Order is not in a payable state");
    }
    payment.markPaid();
    return PaymentResponse.from(payments.save(payment), provider.checkoutUrl(payment.getId()));
  }

  @Scheduled(fixedDelayString = "${marketforge.payment.expiry-check-ms:60000}")
  public void expirePendingPayments() {
    for (Payment payment : payments.findByStatusAndExpiresAtBefore("PENDING", Instant.now())) {
      try {
        expire(payment);
      } catch (RuntimeException error) {
        log.error("payment expiration failed paymentId={}", payment.getId(), error);
      }
    }
  }

  private void expire(Payment payment) {
    commerce.releaseReservation(payment.getOrderId().toString());
    var order = orders.findById(payment.getOrderId())
        .orElseThrow(() -> new NotFoundException("Order not found"));
    if ("PENDING_PAYMENT".equals(order.getStatus().name())) {
      orderService.transition(order.getOrderNumber(),
          com.marketforge.order.domain.OrderStatus.EXPIRED,
          "payment session expired", "SYSTEM", null);
    }
    payment.setStatus("EXPIRED");
    payments.save(payment);
  }
}
