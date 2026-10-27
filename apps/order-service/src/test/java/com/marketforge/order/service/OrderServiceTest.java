package com.marketforge.order.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.marketforge.order.domain.Order;
import com.marketforge.order.domain.OrderHistory;
import com.marketforge.order.repo.OrderHistoryRepository;
import com.marketforge.order.repo.OrderRepository;
import com.marketforge.order.service.dto.CreateOrderRequest;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

  @Mock private OrderRepository orders;
  @Mock private OrderHistoryRepository history;
  @Mock private CommerceClient commerce;
  @InjectMocks private OrderService service;

  @Test
  void createsOrderFromAuthoritativeCatalogQuoteAndReservesByOrderId() {
    UUID userId = UUID.randomUUID();
    UUID productId = UUID.randomUUID();
    when(commerce.quoteProducts(any())).thenReturn(List.of(
        new CommerceClient.ProductQuote(productId.toString(), "SKU-1", "Quoted product",
            new BigDecimal("125.50"), 2)));
    when(orders.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

    var result = service.create(new CreateOrderRequest(
        userId, List.of(new CreateOrderRequest.Line(productId, 2)), null));

    assertEquals("Quoted product", result.items().get(0).name());
    assertEquals(new BigDecimal("251.00"), result.subtotal());
    assertEquals(new BigDecimal("10251.00"), result.totalAmount());
    ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
    verify(orders).save(orderCaptor.capture());
    ArgumentCaptor<String> reservationId = ArgumentCaptor.forClass(String.class);
    verify(commerce).reserveInventory(reservationId.capture(), any());
    assertEquals(orderCaptor.getValue().getId().toString(),
        reservationId.getValue());
  }
}
