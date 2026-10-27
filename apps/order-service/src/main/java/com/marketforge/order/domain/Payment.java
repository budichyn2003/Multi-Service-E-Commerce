package com.marketforge.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payments", schema = "payments")
public class Payment {

  @Id
  private UUID id;

  @Column(name = "order_id", nullable = false)
  private UUID orderId;

  @Column(name = "external_payment_id", unique = true)
  private String externalPaymentId;

  @Column(nullable = false, length = 30)
  private String provider;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 3)
  private String currency;

  @Column(nullable = false, length = 20)
  private String status;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "paid_at")
  private Instant paidAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Payment() {}

  public Payment(UUID id, UUID orderId, BigDecimal amount, String currency, Instant expiresAt) {
    this.id = id;
    this.orderId = orderId;
    this.amount = amount;
    this.currency = currency;
    this.expiresAt = expiresAt;
    this.provider = "mock";
    this.status = "PENDING";
    this.createdAt = Instant.now();
    this.updatedAt = this.createdAt;
  }

  public UUID getId() { return id; }
  public UUID getOrderId() { return orderId; }
  public String getExternalPaymentId() { return externalPaymentId; }
  public void setExternalPaymentId(String externalPaymentId) { this.externalPaymentId = externalPaymentId; }
  public String getProvider() { return provider; }
  public BigDecimal getAmount() { return amount; }
  public String getCurrency() { return currency; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; this.updatedAt = Instant.now(); }
  public Instant getExpiresAt() { return expiresAt; }
  public Instant getPaidAt() { return paidAt; }
  public void markPaid() { this.status = "PAID"; this.paidAt = Instant.now(); this.updatedAt = this.paidAt; }
}
