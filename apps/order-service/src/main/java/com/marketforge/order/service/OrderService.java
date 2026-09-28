package com.marketforge.order.service;

import com.marketforge.order.domain.Order;
import com.marketforge.order.domain.OrderHistory;
import com.marketforge.order.domain.OrderItem;
import com.marketforge.order.domain.OrderStatus;
import com.marketforge.order.repo.OrderHistoryRepository;
import com.marketforge.order.repo.OrderRepository;
import com.marketforge.order.service.dto.CreateOrderRequest;
import com.marketforge.order.service.dto.OrderResponse;
import com.marketforge.order.service.exception.InsufficientInventoryException;
import com.marketforge.order.service.exception.NotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.SplittableRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

  private static final Logger log = LoggerFactory.getLogger(OrderService.class);
  private static final SplittableRandom RANDOM = new SplittableRandom();
  private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

  private final OrderRepository orders;
  private final OrderHistoryRepository history;
  private final CommerceClient commerce;

  public OrderService(OrderRepository orders, OrderHistoryRepository history, CommerceClient commerce) {
    this.orders = orders;
    this.history = history;
    this.commerce = commerce;
  }

  /**
   * Creates an order from validated cart items. Inventory reservation is
   * delegated to the Go commerce service; a failure short-circuits the whole
   * operation so no order row is persisted without reserved stock.
   */
  @Transactional
  public OrderResponse create(CreateOrderRequest req) {
    // 1. Server-side price calculation (never trust client totals).
    BigDecimal subtotal = BigDecimal.ZERO;
    List<OrderItem> items = new ArrayList<>();
    for (var line : req.items()) {
      BigDecimal lineTotal = line.unitPrice().multiply(BigDecimal.valueOf(line.quantity()));
      subtotal = subtotal.add(lineTotal);
      OrderItem item = new OrderItem();
      item.setProductId(line.productId());
      item.setSkuSnapshot(line.sku());
      item.setProductNameSnapshot(line.name());
      item.setUnitPrice(line.unitPrice().setScale(2, RoundingMode.HALF_UP));
      item.setQuantity(line.quantity());
      item.setSubtotal(lineTotal.setScale(2, RoundingMode.HALF_UP));
      items.add(item);
    }

    BigDecimal shipping = subtotal.signum() > 0 ? new BigDecimal("10000") : BigDecimal.ZERO;
    BigDecimal total = subtotal.add(shipping);

    // 2. Reserve inventory in the commerce service (throws on failure).
    try {
      commerce.reserveInventory(req.orderIdToken(), items);
    } catch (InsufficientInventoryException e) {
      throw e;
    } catch (Exception e) {
      log.error("inventory reservation failed", e);
      throw e;
    }

    // 3. Persist order + items + first history entry atomically.
    Order order = new Order();
    order.setOrderNumber(generateOrderNumber());
    order.setUserId(req.userId());
    order.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
    order.setShippingAmount(shipping);
    order.setTotalAmount(total);
    order.setShippingAddressSnapshot(req.shippingAddressJson());

    for (OrderItem item : items) {
      order.addItem(item);
    }

    OrderStatus from = order.getStatus();
    order.setStatus(OrderStatus.PENDING_PAYMENT);
    orders.save(order);

    OrderHistory entry = new OrderHistory();
    entry.setOrderId(order.getId());
    entry.setFromStatus(null);
    entry.setToStatus(OrderStatus.PENDING_PAYMENT.name());
    entry.setReason("order created");
    entry.setActorType("CUSTOMER");
    entry.setActorId(req.userId());
    history.save(entry);

    log.info("order created orderNumber={} total={}", order.getOrderNumber(), total);
    return OrderResponse.from(order);
  }

  /** Applies a validated status transition and records history. */
  @Transactional
  public OrderResponse transition(String orderNumber, OrderStatus target, String reason,
      String actorType, java.util.UUID actorId) {
    Order order = orders.findByOrderNumber(orderNumber)
        .orElseThrow(() -> new NotFoundException("Order not found: " + orderNumber));

    OrderStatus from = order.getStatus();
    if (!from.canTransitionTo(target)) {
      throw new com.marketforge.order.service.exception.IllegalTransitionException(
          "Illegal transition " + from + " -> " + target);
    }
    order.setStatus(target);

    OrderHistory entry = new OrderHistory();
    entry.setOrderId(order.getId());
    entry.setFromStatus(from.name());
    entry.setToStatus(target.name());
    entry.setReason(reason);
    entry.setActorType(actorType);
    entry.setActorId(actorId);
    history.save(entry);

    log.info("order transition orderNumber={} {} -> {}", orderNumber, from, target);
    return OrderResponse.from(order);
  }

  public OrderResponse getByOrderNumber(String orderNumber) {
    return orders.findByOrderNumber(orderNumber)
        .map(OrderResponse::from)
        .orElseThrow(() -> new NotFoundException("Order not found: " + orderNumber));
  }

  private String generateOrderNumber() {
    String date = LocalDate.now().format(DATE_FMT);
    String suffix = Integer.toString(RANDOM.nextInt(36 * 36 * 36 * 36), 36).toUpperCase();
    return "ORD-" + date + "-" + String.format("%4s", suffix).replace(' ', '0');
  }
}
