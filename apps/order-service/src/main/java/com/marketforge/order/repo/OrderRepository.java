package com.marketforge.order.repo;

import com.marketforge.order.domain.Order;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, UUID> {
  Optional<Order> findByOrderNumber(String orderNumber);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select o from Order o where o.orderNumber = :orderNumber")
  Optional<Order> findByOrderNumberForUpdate(@Param("orderNumber") String orderNumber);
}
