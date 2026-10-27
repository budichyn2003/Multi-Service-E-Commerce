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
    // Product names and prices come from the catalog service, never from the client.
    var quotes = commerce.quoteProducts(req.items());
    BigDecimal subtotal = BigDecimal.ZERO;
    List<OrderItem> items = new ArrayList<>();
    for (var quote : quotes) {
      BigDecimal lineTotal = quote.unitPrice().multiply(BigDecimal.valueOf(quote.quantity()));
      subtotal = subtotal.add(lineTotal);
      OrderItem item = new OrderItem();
      item.setProductId(java.util.UUID.fromString(quote.productId()));
      item.setSkuSnapshot(quote.sku());
      item.setProductNameSnapshot(quote.name());
      item.setUnitPrice(quote.unitPrice().setScale(2, RoundingMode.HALF_UP));
      item.setQuantity(quote.quantity());
      item.setSubtotal(lineTotal.setScale(2, RoundingMode.HALF_UP));
      items.add(item);
    }

    BigDecimal shipping = subtotal.signum() > 0 ? new BigDecimal("10000") : BigDecimal.ZERO;
    BigDecimal total = subtotal.add(shipping);

    // The order UUID is the stable idempotency/correlation key for inventory.
    Order order = new Order();
    order.setId(java.util.UUID.randomUUID());
    order.setOrderNumber(generateOrderNumber());
    order.setUserId(req.userId());
    order.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
    order.setShippingAmount(shipping);
    order.setTotalAmount(total);
    order.setShippingAddressSnapshot(req.shippingAddressJson());

    for (OrderItem item : items) {
      order.addItem(item);
    }

    // Reserve inside the same failure boundary. The Go operation is atomic and
    // idempotent for this order ID; its TTL is the compensation for DB outages.
    try {
      commerce.reserveInventory(order.getId().toString(), items);
    } catch (InsufficientInventoryException e) {
      throw e;
    } catch (Exception e) {
      log.error("inventory reservation failed", e);
      throw e;
    }

    // Persist order + items + first history entry atomically.
    order.setStatus(OrderStatus.PENDING_PAYMENT);
    try {
      Order persistedOrder = orders.save(order);
      OrderHistory entry = new OrderHistory();
      entry.setOrderId(persistedOrder.getId());
      entry.setFromStatus(null);
      entry.setToStatus(OrderStatus.PENDING_PAYMENT.name());
      entry.setReason("order created");
      entry.setActorType("CUSTOMER");
      entry.setActorId(req.userId());
      history.save(entry);
      order = persistedOrder;
    } catch (RuntimeException e) {
      try {
        commerce.releaseReservation(order.getId().toString());
      } catch (Exception compensationError) {
        log.error("inventory release compensation failed orderId={}", order.getId(), compensationError);
      }
      throw e;
    }

    log.info("order created orderNumber={} total={}", order.getOrderNumber(), total);
    return OrderResponse.from(order);
  }

  /** Applies a validated status transition and records history. */
  @Transactional
  public OrderResponse transition(String orderNumber, OrderStatus target, String reason,
      String actorType, java.util.UUID actorId) {
    Order order = orders.findByOrderNumberForUpdate(orderNumber)
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
