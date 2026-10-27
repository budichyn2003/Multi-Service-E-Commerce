package com.marketforge.order.repo;

import com.marketforge.order.domain.Payment;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<Payment> findFirstByOrderIdAndStatusOrderByCreatedAtDesc(UUID orderId, String status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Payment p where p.id = :paymentId")
  Optional<Payment> findByIdForUpdate(@Param("paymentId") UUID paymentId);

  List<Payment> findByStatusAndExpiresAtBefore(String status, Instant now);
}
