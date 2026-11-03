package com.marketforge.order.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "webhook_events", schema = "payments")
public class WebhookEvent {

  @Id
  private UUID id = UUID.randomUUID();

  @Column(nullable = false, length = 30)
  private String provider;

  @Column(name = "external_event_id", nullable = false, unique = true, length = 255)
  private String externalEventId;

  @Column(name = "event_type", nullable = false, length = 60)
  private String eventType;

  @Column(columnDefinition = "jsonb")
  private String payload;

  private String signature;

  @Column(nullable = false, length = 20)
  private String status = "RECEIVED";

  @Column(name = "processed_at")
  private Instant processedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  public WebhookEvent() {}

  public WebhookEvent(String provider, String externalEventId, String eventType, String payload, String signature) {
    this.provider = provider;
    this.externalEventId = externalEventId;
    this.eventType = eventType;
    this.payload = payload;
    this.signature = signature;
  }

  public UUID getId() { return id; }
  public String getProvider() { return provider; }
  public String getExternalEventId() { return externalEventId; }
  public String getEventType() { return eventType; }
  public String getPayload() { return payload; }
  public String getSignature() { return signature; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Instant getProcessedAt() { return processedAt; }
  public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
  public Instant getCreatedAt() { return createdAt; }
}

