package com.marketforge.order.repo;

import com.marketforge.order.domain.Order;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, UUID> {
  Optional<Order> findByOrderNumber(String orderNumber);
}
