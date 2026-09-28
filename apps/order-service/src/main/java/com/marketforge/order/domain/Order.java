package com.marketforge.order.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders", schema = "orders")
public class Order {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "order_number", unique = true, nullable = false, length = 30)
  private String orderNumber;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private OrderStatus status = OrderStatus.PENDING_PAYMENT;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal subtotal;

  @Column(name = "discount_amount", precision = 12, scale = 2)
  private BigDecimal discountAmount = BigDecimal.ZERO;

  @Column(name = "shipping_amount", precision = 12, scale = 2)
  private BigDecimal shippingAmount = BigDecimal.ZERO;

  @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal totalAmount;

  @Column(nullable = false, length = 3)
  private String currency = "IDR";

  @Column(name = "shipping_address_snapshot", columnDefinition = "jsonb")
  private String shippingAddressSnapshot;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<OrderItem> items = new ArrayList<>();

  public void addItem(OrderItem item) {
    items.add(item);
    item.setOrder(this);
  }

  /** Applies a status transition if the state machine allows it. */
  public void transitionTo(OrderStatus target, String reason, String actorType, UUID actorId) {
    if (!status.canTransitionTo(target)) {
      throw new IllegalStateException(
          "Illegal transition " + status + " -> " + target);
    }
    OrderStatus from = this.status;
    this.status = target;
    this.updatedAt = Instant.now();
    // history row appended by the service layer inside the same transaction
    this.lastTransitionFrom = from;
    this.lastTransitionReason = reason;
    this.lastActorType = actorType;
    this.lastActorId = actorId;
  }

  // transient fields used to pass transition metadata to the service layer
  @Transient private OrderStatus lastTransitionFrom;
  @Transient private String lastTransitionReason;
  @Transient private String lastActorType;
  @Transient private UUID lastActorId;

  public OrderStatus getLastTransitionFrom() { return lastTransitionFrom; }
  public String getLastTransitionReason() { return lastTransitionReason; }
  public String getLastActorType() { return lastActorType; }
  public UUID getLastActorId() { return lastActorId; }

  // --- getters/setters ---
  public UUID getId() { return id; }
  public String getOrderNumber() { return orderNumber; }
  public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public OrderStatus getStatus() { return status; }
  public void setStatus(OrderStatus status) { this.status = status; }
  public BigDecimal getSubtotal() { return subtotal; }
  public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
  public BigDecimal getDiscountAmount() { return discountAmount; }
  public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
  public BigDecimal getShippingAmount() { return shippingAmount; }
  public void setShippingAmount(BigDecimal shippingAmount) { this.shippingAmount = shippingAmount; }
  public BigDecimal getTotalAmount() { return totalAmount; }
  public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
  public String getCurrency() { return currency; }
  public void setCurrency(String currency) { this.currency = currency; }
  public String getShippingAddressSnapshot() { return shippingAddressSnapshot; }
  public void setShippingAddressSnapshot(String shippingAddressSnapshot) { this.shippingAddressSnapshot = shippingAddressSnapshot; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public List<OrderItem> getItems() { return items; }
}
