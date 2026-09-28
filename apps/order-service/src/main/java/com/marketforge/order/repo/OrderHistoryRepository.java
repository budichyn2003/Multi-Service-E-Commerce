package com.marketforge.order.repo;

import com.marketforge.order.domain.OrderHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderHistoryRepository extends JpaRepository<OrderHistory, UUID> {
  List<OrderHistory> findByOrderIdOrderByCreatedAtAsc(UUID orderId);
}
