package com.marketforge.order.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_history", schema = "orders")
public class OrderHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "order_id", nullable = false)
  private UUID orderId;

  @Column(name = "from_status", length = 30)
  private String fromStatus;

  @Column(name = "to_status", nullable = false, length = 30)
  private String toStatus;

  private String reason;

  @Column(name = "actor_type", nullable = false, length = 20)
  private String actorType; // CUSTOMER | ADMIN | SYSTEM | WEBHOOK

  @Column(name = "actor_id")
  private UUID actorId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  // --- getters/setters ---
  public UUID getId() { return id; }
  public void setOrderId(UUID orderId) { this.orderId = orderId; }
  public String getFromStatus() { return fromStatus; }
  public void setFromStatus(String fromStatus) { this.fromStatus = fromStatus; }
  public String getToStatus() { return toStatus; }
  public void setToStatus(String toStatus) { this.toStatus = toStatus; }
  public String getReason() { return reason; }
  public void setReason(String reason) { this.reason = reason; }
  public String getActorType() { return actorType; }
  public void setActorType(String actorType) { this.actorType = actorType; }
  public void setActorId(UUID actorId) { this.actorId = actorId; }
  public Instant getCreatedAt() { return createdAt; }
}
