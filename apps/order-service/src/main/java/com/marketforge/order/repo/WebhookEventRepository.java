package com.marketforge.order.repo;

import com.marketforge.order.domain.WebhookEvent;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebhookEventRepository extends JpaRepository<WebhookEvent, UUID> {
  Optional<WebhookEvent> findByExternalEventId(String externalEventId);
}

