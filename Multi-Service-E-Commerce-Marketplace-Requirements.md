# Multi-Service E-Commerce / Marketplace Backend
## End-to-End Learning & Portfolio Project Requirements

> **Project type:** Production-oriented learning project  
> **Primary goal:** Expand from a TypeScript/NestJS-centric Full Stack Developer into a Software Engineer who can work across Go, Java/Spring Boot, .NET, Redis, messaging, payment integration, third-party APIs, observability, CI/CD, security, and AI integration.  
> **Important:** This document is intentionally larger than an MVP. The project is designed to be completed incrementally over multiple phases. Do not attempt to implement everything at once.

---

# 1. Project Vision

Build a realistic, multi-service e-commerce/marketplace platform where customers can:

- register and authenticate;
- browse products;
- search, filter, sort, and paginate;
- manage a cart;
- create orders;
- pay through a payment gateway;
- receive payment/status notifications;
- track order status;
- interact with an AI shopping/customer-support assistant.

The system should also support:

- administrators;
- product/catalog management;
- inventory management;
- order management;
- payment processing;
- notifications;
- asynchronous jobs;
- caching;
- rate limiting;
- external integrations;
- audit logs;
- observability;
- automated testing;
- containerization;
- CI/CD;
- production-oriented security.

The platform should deliberately use multiple backend technologies so that the developer learns how different ecosystems solve similar problems.

---

# 2. Core Learning Objectives

By completing this project, you should be able to demonstrate practical familiarity with:

## Backend languages/frameworks

- Go
- Java + Spring Boot
- C# + ASP.NET Core
- Python + FastAPI
- TypeScript + NestJS as a comparison/reference stack

## Databases and data systems

- PostgreSQL
- Redis
- MongoDB or another document database as an optional extension
- Elasticsearch/OpenSearch as an advanced extension
- database indexing
- transactions
- isolation levels
- locking
- connection pooling
- query optimization

## Distributed systems

- REST API
- service boundaries
- synchronous communication
- asynchronous communication
- message brokers
- RabbitMQ
- Kafka as an optional advanced extension
- idempotency
- retries
- dead-letter queues
- eventual consistency
- distributed locking

## Integrations

- payment gateway
- payment webhook
- OAuth
- email provider
- object storage
- optional WhatsApp provider
- third-party API failure handling

## Infrastructure

- Docker
- Docker Compose
- Linux basics
- reverse proxy
- CI/CD
- GitHub Actions
- cloud deployment
- environment management
- secrets

## Observability

- structured logging
- request IDs
- metrics
- health checks
- OpenTelemetry
- Prometheus
- Grafana

## Security

- authentication
- authorization
- RBAC
- JWT
- refresh tokens
- OAuth
- password hashing
- rate limiting
- CORS
- CSRF concepts
- XSS concepts
- SQL injection prevention
- SSRF awareness
- webhook signature verification
- secret management

## Testing

- unit tests
- integration tests
- API tests
- end-to-end tests
- contract testing as an advanced extension
- failure-path testing

## AI

- LLM API
- tool/function calling
- RAG
- embeddings
- vector search
- AI assistant
- guardrails
- conversation history
- AI observability

---

# 3. Non-Goals

The project is not intended to become:

- Tokopedia-scale infrastructure;
- a perfect production marketplace;
- a full ERP;
- a banking system;
- a complete logistics platform.

The purpose is to simulate realistic engineering problems at a manageable scale.

Do not add technology merely because it looks impressive.

Every technology must solve a concrete problem.

---

# 4. Suggested Product Concept

## Product Name

Use a temporary name such as:

**MarketForge**

You may rename it later.

## Business Model

A simplified marketplace/e-commerce platform.

The first implementation may use a single seller/store for simplicity.

The architecture should remain extensible toward multiple sellers.

---

# 5. Main Actors

## 5.1 Customer

Can:

- register;
- log in;
- log out;
- refresh session;
- manage profile;
- manage addresses;
- browse products;
- search products;
- view product details;
- add items to cart;
- update cart quantities;
- remove cart items;
- checkout;
- pay;
- view orders;
- cancel eligible orders;
- track order status;
- receive notifications;
- use AI assistant.

## 5.2 Admin

Can:

- manage users;
- manage products;
- manage categories;
- manage inventory;
- manage orders;
- inspect payments;
- inspect failed payments;
- retry eligible operations;
- inspect audit logs;
- inspect system health;
- inspect operational metrics.

## 5.3 System

Responsible for:

- processing asynchronous jobs;
- payment webhooks;
- inventory reservation;
- notifications;
- cache invalidation;
- scheduled jobs;
- retry mechanisms;
- audit events;
- AI operations.

---

# 6. High-Level Architecture

The initial architecture should evolve gradually.

## Final target architecture

```text
                         ┌───────────────────┐
                         │     Next.js       │
                         │      Web App      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    API Gateway    │
                         │ / BFF / Gateway   │
                         └─────────┬─────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
      ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
      │    Go       │       │ Spring Boot │       │ ASP.NET     │
      │   Service   │       │   Service   │       │   Service   │
      └──────┬──────┘       └──────┬──────┘       └──────┬──────┘
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                  ▼                ▼                ▼
             PostgreSQL         Redis           RabbitMQ
                  │                │                │
                  │                │                │
                  ▼                │                ▼
              Storage              │          Async Workers
                                   │
                                   ▼
                            External Services
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
                Payment         Email         Object Storage
                Gateway          API
```

AI:

```text
                  Next.js
                     │
                     ▼
               AI Assistant
                     │
                     ▼
                FastAPI
                     │
           ┌─────────┼─────────┐
           ▼         ▼         ▼
          LLM      Vector DB   Tools
                     │          │
                     │          ├── Product Search
                     │          ├── Order Lookup
                     │          ├── Inventory Check
                     │          └── Support Ticket
                     │
                     ▼
                    RAG
```

---

# 7. Service Ownership

Do not split services arbitrarily.

## 7.1 Go — Core Commerce Service

Go should own:

- product catalog;
- categories;
- inventory;
- cart;
- basic customer-facing commerce APIs.

Suggested responsibility:

```text
Go Service
├── Product
├── Category
├── Inventory
└── Cart
```

Learning goals:

- Go;
- HTTP;
- routing;
- middleware;
- PostgreSQL;
- transactions;
- concurrency;
- testing;
- Docker;
- API design.

---

# 8. Spring Boot — Order Service

Spring Boot should own:

- order creation;
- order lifecycle;
- order items;
- order state transitions;
- checkout orchestration where appropriate.

Example:

```text
Order Service
├── Order
├── OrderItem
├── OrderStatus
└── OrderHistory
```

Learning goals:

- Java;
- Spring Boot;
- Spring Web;
- Spring Data JPA;
- DTO;
- validation;
- dependency injection;
- exception handling;
- transaction management;
- testing;
- Maven or Gradle.

---

# 9. .NET — Notification Service

ASP.NET Core should own:

- notification templates;
- email notification requests;
- optional WhatsApp notification requests;
- notification history;
- delivery status.

Example:

```text
Notification Service
├── Notification
├── Template
├── DeliveryAttempt
└── Provider
```

Learning goals:

- C#;
- ASP.NET Core;
- Entity Framework Core;
- DI;
- middleware;
- async programming;
- LINQ;
- configuration;
- testing.

---

# 10. Python/FastAPI — AI Service

FastAPI should own:

- AI assistant;
- RAG;
- embeddings;
- vector search;
- tool/function calling;
- conversation history;
- AI guardrails.

Example tools:

```text
get_product()
search_products()
check_inventory()
get_order_status()
get_customer_orders()
create_support_ticket()
```

Learning goals:

- FastAPI;
- LLM API;
- structured output;
- tool calling;
- RAG;
- embeddings;
- vector databases;
- AI safety/guardrails;
- evaluation.

---

# 11. Authentication Service

Initially, authentication may remain inside the API Gateway/Core service.

Requirements:

## Registration

User submits:

- name;
- email;
- password.

Rules:

- email must be unique;
- password must satisfy minimum complexity;
- password must never be stored in plaintext.

Password storage:

- Argon2 or bcrypt.

## Login

Input:

- email;
- password.

Response:

- short-lived access token;
- refresh token.

## Refresh

The client can exchange a valid refresh token for a new access token.

## Logout

Refresh token must be revoked or invalidated.

## Account status

User states:

```text
ACTIVE
SUSPENDED
DISABLED
```

---

# 12. Authorization

Implement RBAC.

Roles:

```text
CUSTOMER
ADMIN
```

Optional:

```text
SELLER
SUPPORT
OPERATIONS
```

Example permissions:

```text
product:read
product:create
product:update
product:delete

order:read
order:create
order:update
order:cancel

inventory:read
inventory:update

user:read
user:update
```

Do not rely only on frontend route protection.

Authorization must be enforced server-side.

---

# 13. User Management

User fields:

```text
id
name
email
password_hash
role
status
created_at
updated_at
last_login_at
```

Requirements:

- unique email;
- normalized email;
- timestamps;
- soft delete or disabled status;
- audit relevant security events.

---

# 14. Address Management

Customer can maintain multiple addresses.

Fields:

```text
id
user_id
label
recipient_name
phone
address_line
city
province
postal_code
country
is_default
created_at
updated_at
```

Rules:

- customer can have multiple addresses;
- only one default address;
- deleting default address must be handled safely.

---

# 15. Product Catalog

Product fields:

```text
id
sku
name
slug
description
price
compare_at_price
category_id
status
weight
created_at
updated_at
```

Status:

```text
DRAFT
ACTIVE
INACTIVE
ARCHIVED
```

Requirements:

- SKU unique;
- slug unique;
- price must be non-negative;
- inactive products cannot be purchased;
- archived products should not appear in normal search.

---

# 16. Product Images

Store metadata in PostgreSQL.

Actual file:

- object storage.

Fields:

```text
id
product_id
url
storage_key
alt_text
sort_order
created_at
```

Do not store large binary images directly in PostgreSQL for this project.

---

# 17. Categories

Support:

```text
id
name
slug
parent_id
status
```

Allow hierarchical categories.

Example:

```text
Electronics
├── Laptop
├── Smartphone
└── Accessories
```

---

# 18. Product Search

Initial search:

- PostgreSQL;
- indexed columns;
- basic full-text search.

Filters:

- category;
- price range;
- status.

Sorting:

- newest;
- price ascending;
- price descending;
- relevance where available.

Pagination:

- page/limit initially;
- cursor pagination as an advanced extension.

---

# 19. Inventory

Inventory fields:

```text
id
product_id
available_quantity
reserved_quantity
sold_quantity
updated_at
```

Invariant:

```text
available_quantity >= 0
reserved_quantity >= 0
```

Inventory operations:

```text
reserve
release
confirm
adjust
```

---

# 20. Inventory Reservation

When checkout starts:

```text
Customer
   ↓
Checkout
   ↓
Reserve inventory
```

Reservation should have an expiration time.

Example:

```text
Reservation
├── id
├── order_id
├── product_id
├── quantity
├── status
├── expires_at
└── created_at
```

Statuses:

```text
ACTIVE
RELEASED
CONFIRMED
EXPIRED
```

This introduces:

- transactions;
- race conditions;
- locking;
- concurrency;
- idempotency.

---

# 21. Cart

Customer cart:

```text
Cart
├── id
├── user_id
├── created_at
└── updated_at
```

Cart item:

```text
CartItem
├── id
├── cart_id
├── product_id
├── quantity
├── unit_price_snapshot
└── created_at
```

Requirements:

- one active cart per customer;
- quantity must be positive;
- inactive products cannot be added;
- cart must validate current availability during checkout.

---

# 22. Checkout

Checkout must not blindly trust frontend prices.

Backend must:

1. load cart;
2. load current products;
3. validate product status;
4. validate inventory;
5. calculate prices;
6. calculate subtotal;
7. calculate shipping;
8. calculate discounts if implemented;
9. create checkout/order;
10. reserve inventory;
11. create payment transaction.

Final amount must be calculated server-side.

---

# 23. Order

Order fields:

```text
id
order_number
user_id
status
subtotal
discount_amount
shipping_amount
total_amount
currency
shipping_address_snapshot
created_at
updated_at
```

Important:

The shipping address should be snapshotted at order creation.

Changing a user's address later must not modify an existing order.

---

# 24. Order Item

Fields:

```text
id
order_id
product_id
sku_snapshot
product_name_snapshot
unit_price
quantity
subtotal
```

Product name and price should be snapshotted.

---

# 25. Order State Machine

Implement explicit state transitions.

Example:

```text
PENDING_PAYMENT
      │
      ├──► PAID
      │      │
      │      ├──► PROCESSING
      │      │       │
      │      │       ▼
      │      │    SHIPPED
      │      │       │
      │      │       ▼
      │      │   DELIVERED
      │      │
      │      └──► CANCELLED
      │
      └──► EXPIRED
```

Rules must prevent invalid transitions.

Example:

```text
DELIVERED → PENDING_PAYMENT
```

must be rejected.

---

# 26. Order History

Every important status transition should create an order history entry.

Fields:

```text
id
order_id
from_status
to_status
reason
actor_type
actor_id
created_at
```

Actor types:

```text
CUSTOMER
ADMIN
SYSTEM
WEBHOOK
```

---

# 27. Payment Integration

Use a real or sandbox payment provider appropriate for your environment.

Do not hard-code the provider.

Create an abstraction:

```text
PaymentProvider
├── createPayment()
├── getPaymentStatus()
├── verifyWebhook()
└── refund()
```

Potential provider implementation:

```text
PaymentGatewayProvider
```

---

# 28. Payment Model

Fields:

```text
id
order_id
external_payment_id
provider
amount
currency
status
payment_method
expires_at
paid_at
created_at
updated_at
```

Statuses:

```text
PENDING
PAID
FAILED
EXPIRED
CANCELLED
REFUNDED
```

---

# 29. Payment Flow

```text
Customer
   ↓
Checkout
   ↓
Order = PENDING_PAYMENT
   ↓
Payment Service
   ↓
Payment Gateway
   ↓
Payment URL / QR / VA
   ↓
Customer pays
   ↓
Gateway
   ↓
Webhook
   ↓
Backend
   ↓
Verify signature
   ↓
Check idempotency
   ↓
Update payment
   ↓
Update order
   ↓
Publish OrderPaid event
```

---

# 30. Webhook Requirements

Webhook endpoint:

```text
POST /webhooks/payment
```

Requirements:

- verify provider signature;
- validate payload;
- store webhook event;
- support duplicate delivery;
- be idempotent;
- return quickly;
- process heavy work asynchronously.

Webhook event table:

```text
id
provider
external_event_id
event_type
payload
signature
processed_at
status
created_at
```

A duplicate webhook must not create a duplicate payment/order transition.

---

# 31. Idempotency

Implement idempotency for important operations.

Example:

```text
POST /orders
Idempotency-Key: abc-123
```

If the same request arrives twice:

```text
Request #1 → create order
Request #2 → return existing result
```

Apply the concept to:

- order creation;
- payment creation;
- webhook handling;
- notification delivery where appropriate.

---

# 32. Redis

Use Redis for multiple real-world purposes.

## 32.1 Product Cache

```text
GET /products/:id
        ↓
Redis
        ↓
cache hit → return
cache miss → PostgreSQL → Redis
```

## 32.2 Cache Invalidation

When a product changes:

```text
UPDATE product
    ↓
invalidate product cache
```

## 32.3 Rate Limiting

Protect:

- login;
- registration;
- AI endpoint;
- public product APIs;
- webhook endpoints where appropriate.

## 32.4 OTP / Temporary Data

Optional:

```text
otp:user:123
```

with TTL.

## 32.5 Distributed Lock

Use a Redis lock for selected concurrency scenarios.

Document why the lock is needed.

Do not use Redis locks just for demonstration.

---

# 33. RabbitMQ

Use RabbitMQ for asynchronous events.

Initial events:

```text
OrderCreated
PaymentCreated
OrderPaid
OrderCancelled
InventoryReserved
InventoryReleased
NotificationRequested
```

Example:

```text
Order Service
      │
      │ OrderPaid
      ▼
   RabbitMQ
      │
      ├──► Notification Service
      │
      ├──► Inventory Service
      │
      └──► Analytics Worker
```

---

# 34. RabbitMQ Requirements

Implement:

- exchanges;
- queues;
- routing keys;
- consumers;
- acknowledgements;
- retry;
- dead-letter queue;
- message persistence where appropriate.

Failure scenario:

```text
Consumer fails
    ↓
Retry
    ↓
Retry
    ↓
Retry
    ↓
DLQ
```

Document retry policy.

---

# 35. Eventual Consistency

Do not assume every service updates at exactly the same time.

Example:

```text
Order = PAID
```

may happen before:

```text
Notification = SENT
```

The system must tolerate temporary inconsistency.

The UI should show meaningful states rather than assuming every operation is synchronous.

---

# 36. Notification Service — .NET

Notification service receives events.

Examples:

```text
OrderCreated
PaymentPending
PaymentSuccess
PaymentFailed
OrderShipped
OrderDelivered
```

Notification channels:

```text
EMAIL
WHATSAPP (optional)
```

---

# 37. Email Integration

Implement provider abstraction:

```text
EmailProvider
├── send()
└── checkStatus()
```

Notification record:

```text
id
user_id
order_id
channel
template
recipient
status
provider_message_id
created_at
sent_at
```

Statuses:

```text
PENDING
SENT
FAILED
RETRYING
```

---

# 38. Object Storage

Use an S3-compatible provider.

Store:

- product images;
- optional user uploads;
- optional invoice documents.

Requirements:

- generate unique storage keys;
- validate file type;
- validate file size;
- avoid trusting original filenames;
- store metadata;
- never expose secret credentials to frontend.

---

# 39. OAuth

Implement at least one OAuth login.

Example:

```text
Google OAuth
```

Flow:

```text
Browser
 ↓
Google
 ↓
Authorization Code
 ↓
Backend
 ↓
Exchange code
 ↓
Get user identity
 ↓
Create/find local account
 ↓
Issue application session
```

Do not treat an OAuth provider access token as your application's authorization token without deliberate design.

---

# 40. Search Engine Extension

After the PostgreSQL search works, add:

**OpenSearch or Elasticsearch.**

Use it for:

- product full-text search;
- relevance;
- autocomplete;
- typo tolerance;
- faceted search.

Synchronization:

```text
Product Updated
      ↓
Event
      ↓
Search Index Worker
      ↓
Search Engine
```

This teaches eventual consistency.

---

# 41. MongoDB Extension

Optional.

Create a small bounded use case such as:

```text
ProductReview
```

or:

```text
AIConversation
```

Use it to compare:

```text
PostgreSQL
vs
MongoDB
```

Document why the selected data is better represented as a document.

Do not migrate the entire application to MongoDB just to use it.

---

# 42. AI Assistant

The AI assistant should not directly access the database.

Architecture:

```text
User
 ↓
Next.js
 ↓
FastAPI AI Service
 ↓
LLM
 ↓
Tool Calling
 ↓
Internal APIs
```

Available tools:

```text
search_products
get_product_details
check_inventory
get_order_status
get_customer_orders
create_support_ticket
```

---

# 43. AI Guardrails

The AI must not:

- invent order status;
- invent product availability;
- invent prices;
- expose another user's data;
- execute admin operations;
- bypass authorization;
- claim payment success without backend evidence.

For sensitive information:

```text
LLM
 ↓
Tool
 ↓
Authorization
 ↓
Data
```

not:

```text
LLM
 ↓
Database
```

---

# 44. RAG

Create a knowledge base containing:

- shipping policy;
- return policy;
- refund policy;
- payment FAQ;
- account FAQ;
- product usage guides;
- customer support documentation.

Pipeline:

```text
Documents
 ↓
Load
 ↓
Chunk
 ↓
Embedding
 ↓
Vector Store
 ↓
Retrieve
 ↓
LLM
 ↓
Answer
```

The AI should cite or reference retrieved knowledge where appropriate.

---

# 45. AI Evaluation

Create a small evaluation dataset.

Example:

```text
Question:
How long can I request a refund?

Expected:
The policy-defined refund period.
```

Evaluate:

- factual correctness;
- retrieval quality;
- hallucination;
- tool selection;
- unauthorized data access;
- response latency.

---

# 46. API Design

All services should expose documented APIs.

Use:

**OpenAPI / Swagger**

Requirements:

- request schemas;
- response schemas;
- authentication;
- error responses;
- examples;
- pagination;
- validation rules.

---

# 47. API Error Format

Use a consistent structure.

Example:

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "requestId": "req_123"
  }
}
```

Do not expose stack traces to clients.

---

# 48. Pagination

Implement:

### Offset pagination

Initially:

```text
?page=1&limit=20
```

Then implement:

### Cursor pagination

For large datasets:

```text
?cursor=abc123&limit=20
```

Document the trade-offs.

---

# 49. Validation

Validate at the API boundary.

Examples:

- email;
- UUID;
- SKU;
- price;
- quantity;
- pagination;
- enum values.

Never rely solely on frontend validation.

---

# 50. Database Requirements

PostgreSQL should include appropriate indexes.

At minimum consider:

```text
users.email
products.sku
products.slug
products.category_id
orders.user_id
orders.order_number
orders.status
order_items.order_id
payments.order_id
```

Use:

```sql
EXPLAIN ANALYZE
```

to investigate selected slow queries.

---

# 51. Transactions

Use transactions for operations that must be atomic.

Example checkout:

```text
BEGIN
  validate cart
  reserve inventory
  create order
  create order items
COMMIT
```

If a critical step fails:

```text
ROLLBACK
```

Document where transactions are required and where eventual consistency is acceptable.

---

# 52. Concurrency Problems to Reproduce

Deliberately test:

## Overselling

Two customers purchase the final unit simultaneously.

Expected:

```text
Only one succeeds.
```

## Duplicate payment webhook

Expected:

```text
One logical payment transition.
```

## Duplicate order request

Expected:

```text
One order.
```

## Cache stampede

Optional advanced scenario.

---

# 53. Security Requirements

Implement and document:

- password hashing;
- JWT expiration;
- refresh token handling;
- RBAC;
- server-side authorization;
- input validation;
- SQL injection prevention;
- CORS policy;
- secure HTTP headers;
- rate limiting;
- secret management;
- webhook signature verification;
- file upload validation;
- audit logs.

Also document:

- threat model;
- trust boundaries;
- sensitive data;
- attack surfaces.

---

# 54. Audit Logging

Record important actions:

```text
USER_LOGIN
USER_LOGOUT
PASSWORD_CHANGED
PRODUCT_CREATED
PRODUCT_UPDATED
INVENTORY_ADJUSTED
ORDER_CREATED
ORDER_CANCELLED
PAYMENT_UPDATED
ADMIN_ACTION
```

Fields:

```text
id
actor_id
actor_role
action
resource_type
resource_id
metadata
ip_address
user_agent
created_at
```

Avoid logging passwords, tokens, payment secrets, or other sensitive credentials.

---

# 55. Observability

Every service should have:

## Logs

Structured JSON logs.

Include:

```text
timestamp
level
service
request_id
trace_id
message
duration
status_code
```

## Health checks

Example:

```text
/health
/ready
```

Differentiate:

```text
liveness
readiness
```

---

# 56. Metrics

Track:

```text
HTTP request count
HTTP error count
HTTP latency
database latency
cache hit ratio
queue depth
queue processing time
payment failures
notification failures
AI request latency
AI token usage where available
```

---

# 57. OpenTelemetry

Instrument:

```text
Next.js
Go
Spring Boot
.NET
FastAPI
```

Where practical.

Trace:

```text
HTTP request
 ↓
API Gateway
 ↓
Order Service
 ↓
PostgreSQL
 ↓
RabbitMQ
 ↓
Notification Service
```

Goal:

Understand one user operation across multiple services.

---

# 58. Prometheus + Grafana

Use Prometheus for metrics.

Use Grafana for dashboards.

Suggested dashboard:

```text
Requests / sec
Error rate
P95 latency
Database latency
Redis hit rate
RabbitMQ queue depth
Payment failure rate
AI latency
```

---

# 59. Docker

Every backend service must have its own Dockerfile.

Target:

```text
docker compose up
```

should start the local environment.

Suggested services:

```text
frontend
api-gateway
go-service
order-service
dotnet-service
ai-service
postgres
redis
rabbitmq
mailhog
prometheus
grafana
```

Add Elasticsearch/OpenSearch later.

---

# 60. Docker Requirements

Learn and implement:

- multi-stage builds;
- minimal runtime images;
- non-root containers where practical;
- health checks;
- environment variables;
- persistent volumes;
- container networking;
- service dependencies;
- graceful shutdown.

---

# 61. Local Development

Provide:

```text
.env.example
docker-compose.yml
Makefile or task runner
README.md
```

A new developer should be able to:

```text
clone
↓
copy env
↓
docker compose up
↓
run migrations
↓
seed database
↓
open application
```

---

# 62. CI Pipeline

Use GitHub Actions.

On pull request:

```text
lint
↓
unit tests
↓
integration tests
↓
build
```

On main branch:

```text
test
↓
build
↓
Docker image
↓
push registry
↓
deploy
```

---

# 63. Deployment

Deploy at least one complete environment.

Possible architecture:

```text
Frontend
   ↓
Cloud hosting

Backend services
   ↓
Container hosting

PostgreSQL
   ↓
Managed database

Redis
   ↓
Managed Redis

RabbitMQ
   ↓
Managed/self-hosted

Object Storage
   ↓
S3-compatible service
```

You do not need to deploy every experimental extension.

---

# 64. Environment Management

Separate:

```text
development
test
staging
production
```

Never commit:

```text
API keys
JWT secrets
database passwords
payment credentials
OAuth secrets
LLM API keys
```

Use:

```text
.env.example
```

with placeholders.

---

# 65. Testing Strategy

## Unit tests

Test:

- business rules;
- calculations;
- state transitions;
- validation;
- utility functions.

## Integration tests

Test:

- database;
- Redis;
- RabbitMQ;
- external service adapters.

## E2E tests

Test:

```text
Register
→ Login
→ Browse
→ Cart
→ Checkout
→ Payment
→ Webhook
→ Order Paid
→ Notification
```

---

# 66. Failure Testing

The project is incomplete if only happy paths work.

Test:

- database unavailable;
- Redis unavailable;
- RabbitMQ unavailable;
- payment provider timeout;
- payment provider failure;
- duplicate webhook;
- malformed webhook;
- email provider failure;
- insufficient inventory;
- expired reservation;
- invalid JWT;
- expired refresh token;
- unauthorized admin operation;
- AI tool failure.

---

# 67. Retry Policy

Define retry rules.

Example:

```text
Transient network error
→ retry

Validation error
→ no retry

Authentication error
→ no retry

Provider 5xx
→ retry

Provider 4xx
→ usually no retry
```

Use exponential backoff where appropriate.

---

# 68. Dead Letter Queue

Messages that repeatedly fail should enter:

```text
DLQ
```

Provide an admin/operations workflow to inspect them.

Optional:

```text
retry DLQ message
```

---

# 69. Scheduled Jobs

Implement at least:

### Expired payment cleanup

```text
PENDING_PAYMENT
+
expired
↓
EXPIRED
```

### Expired inventory reservation

```text
ACTIVE reservation
+
expires_at < now
↓
RELEASED
```

### Notification retry

```text
FAILED
↓
retry
```

---

# 70. Admin Dashboard

Admin UI should provide:

## Dashboard

- total orders;
- paid orders;
- pending payments;
- failed payments;
- low-stock products;
- notification failures;
- queue status.

## Products

- CRUD;
- stock adjustment;
- image management.

## Orders

- list;
- filter;
- details;
- status history.

## Users

- list;
- status;
- role.

## Operations

- failed jobs;
- webhook events;
- audit logs.

---

# 71. Frontend Requirements

Next.js should provide:

```text
/
 /products
 /products/[slug]
 /search
 /cart
 /checkout
 /orders
 /orders/[id]
 /profile
 /login
 /register
 /admin
 /assistant
```

Frontend responsibilities:

- UI;
- state management;
- API calls;
- authentication state;
- loading/error states;
- optimistic UI only where safe.

Business-critical calculations remain server-side.

---

# 72. Frontend Performance

Implement:

- image optimization;
- pagination;
- loading states;
- error boundaries;
- caching where appropriate;
- server/client component decisions;
- API request cancellation where useful.

---

# 73. API Gateway / BFF

The gateway may provide:

- authentication;
- request ID;
- routing;
- rate limiting;
- aggregation;
- centralized error handling.

Avoid turning it into a giant business-logic service.

Business logic belongs to the owning service.

---

# 74. Service Communication

Use REST for synchronous operations.

Use RabbitMQ events for asynchronous operations.

Example:

```text
Need immediate answer?
→ REST

Can happen asynchronously?
→ Event/message
```

Document why each communication method was chosen.

---

# 75. Service Data Ownership

Avoid direct database access across services.

Bad:

```text
Order Service
   ↓
Product Service DB directly
```

Preferred:

```text
Order Service
   ↓
Product API
```

or:

```text
Event
```

Each service should own its data.

For the early learning phase, a shared PostgreSQL instance is acceptable, but services should still treat schemas/tables as owned boundaries. A later phase can move toward separate databases.

---

# 76. API Versioning

Implement:

```text
/api/v1
```

Document how breaking changes would be introduced.

---

# 77. Documentation Requirements

Repository must contain:

```text
README.md
ARCHITECTURE.md
API.md
DATABASE.md
SECURITY.md
OBSERVABILITY.md
DEPLOYMENT.md
DECISIONS.md
LEARNING.md
```

Also create:

```text
docs/
├── architecture/
├── api/
├── database/
├── security/
├── operations/
├── decisions/
└── learning/
```

---

# 78. Architecture Decision Records

For important decisions, create ADRs.

Examples:

```text
ADR-001 Why Go for Core Commerce
ADR-002 Why Spring Boot for Orders
ADR-003 Why ASP.NET Core for Notifications
ADR-004 Why PostgreSQL
ADR-005 Why Redis
ADR-006 Why RabbitMQ
ADR-007 Why REST + Events
ADR-008 Payment Provider Selection
ADR-009 Cache Strategy
ADR-010 AI Tool Calling Architecture
```

Each ADR should contain:

```text
Context
Decision
Alternatives
Consequences
```

---

# 79. Git Strategy

Use meaningful commits.

Examples:

```text
feat(product): add product creation API
feat(cart): implement cart item management
feat(order): implement order state machine
feat(payment): add payment provider adapter
feat(webhook): add idempotent payment webhook
feat(redis): add product cache
feat(queue): publish order paid event
test(order): add transition tests
fix(inventory): prevent overselling
```

---

# 80. Branch Strategy

Suggested:

```text
main
develop
feature/*
fix/*
```

Pull requests should include:

- what changed;
- why;
- testing performed;
- screenshots when UI changes;
- known limitations.

---

# 81. Seed Data

Create realistic seed data:

- 1 admin;
- several customers;
- categories;
- 50+ products;
- inventory;
- example orders;
- example reviews if implemented.

Do not use real personal data.

---

# 82. Demo Scenario

The final portfolio demo should show:

```text
1. Customer registers
2. Customer logs in
3. Customer searches product
4. Customer opens product
5. Customer adds to cart
6. Customer checks out
7. Backend reserves stock
8. Payment created
9. Payment gateway sandbox used
10. Webhook received
11. Webhook verified
12. Order becomes PAID
13. OrderPaid event published
14. Notification service consumes event
15. Email sent
16. Customer views order
17. Admin views order
18. AI assistant answers a product question
19. AI calls product tool
20. Observability dashboard shows the request trace
```

This becomes the main portfolio walkthrough.

---

# 83. Recommended Repository Structure

A possible monorepo:

```text
marketforge/
│
├── apps/
│   ├── web/
│   ├── gateway/
│   ├── commerce-go/
│   ├── order-service/
│   ├── notification-service/
│   └── ai-service/
│
├── packages/
│   ├── api-contracts/
│   ├── types/
│   └── config/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── prometheus/
│   ├── grafana/
│   └── rabbitmq/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── security/
│   ├── operations/
│   ├── decisions/
│   └── learning/
│
├── scripts/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── .env.example
├── README.md
├── ARCHITECTURE.md
├── SECURITY.md
├── DEPLOYMENT.md
└── LEARNING.md
```

You may later split services into separate repositories if there is a real reason.

---

# 84. Development Phases

Do not skip phases.

---

## Phase 0 — Project Foundation

### Deliverables

- repository;
- README;
- architecture diagram;
- requirements;
- environment setup;
- Docker Compose;
- PostgreSQL;
- Git conventions.

### Learn

- project architecture;
- Docker networking;
- environment management.

### Definition of Done

A fresh clone can start PostgreSQL through Docker.

---

# Phase 1 — Go Commerce Service

### Build

- product CRUD;
- category CRUD;
- product list;
- product detail;
- search;
- pagination;
- inventory.

### Learn

- Go;
- HTTP;
- routing;
- middleware;
- PostgreSQL;
- transactions;
- testing.

### Definition of Done

You can build and test a production-style Go REST API.

---

# Phase 2 — Next.js Frontend

Build:

- login;
- product page;
- search;
- cart;
- admin product UI.

Learn:

- integration with non-Node backend;
- auth handling;
- loading/error states.

---

# Phase 3 — Redis

Implement:

- product cache;
- cache invalidation;
- rate limiting;
- TTL;
- optional distributed lock.

Definition:

You can explain when Redis should and should not be used.

---

# Phase 4 — Spring Boot Order Service

Implement:

- order;
- order item;
- status machine;
- order history;
- checkout integration.

Learn:

- Java;
- Spring Boot;
- JPA;
- transaction management;
- dependency injection.

---

# Phase 5 — Inventory Concurrency

Reproduce:

```text
Two users
+
one remaining item
```

Prevent overselling.

Learn:

- row locking;
- transactions;
- isolation;
- race conditions.

---

# Phase 6 — Payment

Implement:

- payment abstraction;
- sandbox payment;
- payment record;
- payment status;
- expiration.

---

# Phase 7 — Webhook + Idempotency

Implement:

- webhook;
- signature verification;
- duplicate event protection;
- event storage;
- idempotent processing.

This is a major portfolio milestone.

---

# Phase 8 — RabbitMQ

Implement:

```text
OrderPaid
→ RabbitMQ
→ Notification
```

Then:

```text
OrderCreated
→ RabbitMQ
→ Analytics
```

Add:

- retry;
- DLQ;
- acknowledgement.

---

# Phase 9 — .NET Notification Service

Implement:

- notification API;
- email adapter;
- notification history;
- retry.

Learn:

- C#;
- ASP.NET Core;
- EF Core;
- async/await.

---

# Phase 10 — Third-Party Integrations

Implement:

- OAuth;
- email;
- object storage;
- payment;
- optional WhatsApp.

Document:

- credentials;
- failure modes;
- rate limits;
- retries.

---

# Phase 11 — Security Hardening

Perform a security pass.

Test:

- unauthorized access;
- privilege escalation;
- invalid tokens;
- expired tokens;
- injection;
- rate limiting;
- malicious file upload;
- webhook forgery.

---

# Phase 12 — Testing

Add:

- unit tests;
- integration tests;
- E2E;
- failure tests.

Target meaningful coverage rather than an arbitrary percentage.

---

# Phase 13 — Observability

Add:

- structured logs;
- request IDs;
- metrics;
- health checks;
- OpenTelemetry;
- Prometheus;
- Grafana.

---

# Phase 14 — CI/CD

Build:

```text
PR
→ lint
→ test
→ build
```

and:

```text
main
→ test
→ build image
→ push
→ deploy
```

---

# Phase 15 — Search Engine

Add:

- OpenSearch/Elasticsearch;
- product indexing;
- search;
- autocomplete;
- filters.

---

# Phase 16 — AI Assistant

Build:

- FastAPI;
- LLM;
- tool calling;
- product search;
- order lookup;
- RAG;
- guardrails;
- evaluation.

---

# Phase 17 — Production Deployment

Deploy:

- frontend;
- core services;
- PostgreSQL;
- Redis;
- RabbitMQ;
- object storage.

Then perform:

- load testing;
- failure testing;
- security review;
- monitoring review.

---

# 85. Advanced Optional Phase — Kafka

Only after RabbitMQ is understood.

Implement a small event-streaming use case:

```text
Order Events
     ↓
Kafka
     ↓
Analytics Consumer
```

Learn:

- topics;
- partitions;
- offsets;
- consumer groups;
- ordering;
- retention.

Do not replace RabbitMQ just because Kafka is popular.

The point is to understand the difference.

---

# 86. Advanced Optional Phase — Kubernetes

Only after Docker and deployment are comfortable.

Learn:

- Pod;
- Deployment;
- Service;
- ConfigMap;
- Secret;
- Ingress;
- HPA;
- readiness/liveness;
- rolling deployment.

Deploy one or two services first.

Do not Kubernetes-ify the entire project immediately.

---

# 87. Advanced Optional Phase — Load Testing

Use a tool such as:

- k6;
- Locust;
- Artillery.

Test:

```text
GET /products
POST /cart
POST /orders
GET /orders
```

Measure:

- throughput;
- latency;
- error rate;
- resource usage.

---

# 88. Advanced Optional Phase — Distributed Tracing

Trace:

```text
Frontend
 ↓
Gateway
 ↓
Order
 ↓
PostgreSQL
 ↓
RabbitMQ
 ↓
Notification
 ↓
Email
```

Then deliberately introduce latency and identify the bottleneck.

---

# 89. Advanced Optional Phase — Outbox Pattern

Implement:

```text
Database Transaction
        │
        ├── save business data
        └── save event to outbox
                    │
                    ▼
              Outbox Worker
                    │
                    ▼
                 RabbitMQ
```

This solves the problem of:

```text
DB commit succeeds
but
message publish fails
```

This is an important distributed-systems concept.

---

# 90. Advanced Optional Phase — Saga

If the project becomes mature enough, model a distributed checkout workflow.

Example:

```text
Create Order
 ↓
Reserve Inventory
 ↓
Create Payment
 ↓
Payment Success
 ↓
Confirm Inventory
```

Failure:

```text
Payment failed
 ↓
Release Inventory
 ↓
Cancel Order
```

Document compensation actions.

---

# 91. Portfolio Requirements

The project should eventually demonstrate:

## Backend

- Go;
- Spring Boot;
- ASP.NET Core;
- FastAPI.

## Architecture

- modular monolith concepts;
- service boundaries;
- microservices concepts;
- synchronous communication;
- asynchronous communication.

## Data

- PostgreSQL;
- Redis;
- optional MongoDB;
- optional Elasticsearch/OpenSearch.

## Integration

- payment;
- webhook;
- OAuth;
- email;
- object storage.

## Infrastructure

- Docker;
- CI/CD;
- deployment.

## Reliability

- retry;
- idempotency;
- DLQ;
- health checks;
- observability.

## Security

- JWT;
- RBAC;
- OAuth;
- validation;
- webhook verification;
- rate limiting.

## AI

- LLM;
- RAG;
- embeddings;
- tool calling;
- guardrails.

---

# 92. Portfolio README Structure

Your final README should contain:

```text
1. Project Overview
2. Features
3. Architecture
4. Technology Stack
5. Service Responsibilities
6. Database Design
7. Authentication
8. Payment Flow
9. Event Flow
10. Redis Strategy
11. RabbitMQ Strategy
12. AI Architecture
13. Security
14. Testing
15. Observability
16. CI/CD
17. Deployment
18. Architecture Decisions
19. Challenges
20. Lessons Learned
21. Screenshots
22. Demo
```

---

# 93. What You Should Be Able to Explain in an Interview

After completing the project, you should be able to answer:

### Backend

- Why Go?
- Why Spring Boot?
- Why .NET?
- Why not use NestJS for everything?
- How does dependency injection differ across frameworks?
- How does each framework handle middleware?
- How does each framework handle errors?

### Database

- Why PostgreSQL?
- Why Redis?
- When should you use a cache?
- What causes cache invalidation problems?
- What is a transaction?
- What is isolation?
- How do you prevent overselling?

### Distributed systems

- Why RabbitMQ?
- When would you use Kafka?
- What is eventual consistency?
- What is idempotency?
- What happens when a consumer fails?
- What is a dead-letter queue?
- What is the Outbox Pattern?

### Payment

- Why use a webhook?
- How do you verify a webhook?
- How do you prevent duplicate payment processing?
- What happens if the provider times out?

### Security

- Why hash passwords?
- Why use refresh tokens?
- What is RBAC?
- How do you protect an admin endpoint?
- How do you prevent SQL injection?
- How do you protect webhook endpoints?

### Infrastructure

- Why Docker?
- What happens inside Docker Compose?
- How do services communicate?
- How would you deploy this system?
- How does CI/CD work?

### Observability

- What is a log?
- What is a metric?
- What is a trace?
- Why do you need request IDs?

### AI

- Why RAG?
- Why tool calling?
- How do you prevent the AI from exposing another customer's data?
- How do you evaluate AI responses?
- Why should the LLM not access the database directly?

---

# 94. Learning Rule

Do not study every technology completely before coding.

Use this loop:

```text
Requirement
   ↓
What technology is needed?
   ↓
Learn only the necessary concept
   ↓
Implement
   ↓
Break it intentionally
   ↓
Debug
   ↓
Test
   ↓
Document
   ↓
Move to next requirement
```

For example:

```text
Requirement:
Cache product API

Need:
Redis

Study:
Redis data structures
TTL
GET/SET
cache invalidation

Implement

Break Redis

Recover

Document
```

This is the intended learning method.

---

# 95. Definition of "Finished"

The project is considered **Portfolio v1.0** when:

- customer can register/login;
- customer can browse products;
- customer can search;
- customer can use cart;
- customer can checkout;
- inventory is safely reserved;
- order is created;
- payment sandbox works;
- webhook is verified and idempotent;
- order status updates correctly;
- RabbitMQ handles asynchronous events;
- notification service sends email;
- Redis is used meaningfully;
- Go service is running;
- Spring Boot service is running;
- .NET service is running;
- FastAPI AI service is running;
- tests cover critical flows;
- Docker Compose runs the stack;
- CI pipeline passes;
- observability exists;
- security controls exist;
- documentation is complete;
- the project can be demonstrated end-to-end.

---

# 96. Definition of "Finished — Advanced"

The project becomes **Portfolio v2.0** when it additionally has:

- OpenSearch/Elasticsearch;
- RAG;
- AI tool calling;
- AI evaluation;
- OpenTelemetry;
- Prometheus;
- Grafana;
- Outbox pattern;
- load testing;
- advanced failure testing;
- cloud deployment;
- Kubernetes for selected services;
- Kafka experiment;
- ADR documentation;
- architecture trade-off documentation.

---

# 97. Recommended Priority

Do not treat every requirement equally.

## Must Have

```text
Go
PostgreSQL
Next.js
Redis
Spring Boot
Payment Gateway
Webhook
RabbitMQ
ASP.NET Core
Docker
Testing
Security
CI/CD
```

## Strongly Recommended

```text
FastAPI
OAuth
Object Storage
Email
Observability
OpenTelemetry
Prometheus
Grafana
```

## Advanced

```text
Elasticsearch/OpenSearch
MongoDB
Kafka
Outbox Pattern
Saga
Kubernetes
Load Testing
```

---

# 98. Final Learning Outcome

At the end, the goal is not:

> "I know Go, Java, C#, Redis, RabbitMQ, Docker, Kubernetes, Kafka, and AI."

The real goal is:

> **"I understand how a modern backend system is designed, built, tested, integrated, deployed, observed, and secured, and I can adapt those concepts across different technology ecosystems."**

That is the actual skill this project is intended to build.

---

# 99. Personal Learning Tracker

Keep this section updated as you work.

## Backend

- [ ] Go fundamentals in context
- [ ] Go REST API
- [ ] Go PostgreSQL
- [ ] Go testing
- [ ] Spring Boot
- [ ] Spring Data JPA
- [ ] Spring Security
- [ ] ASP.NET Core
- [ ] Entity Framework Core
- [ ] FastAPI

## Data

- [ ] PostgreSQL indexing
- [ ] Transactions
- [ ] Isolation levels
- [ ] Locking
- [ ] Query optimization
- [ ] Redis cache
- [ ] Redis rate limiting
- [ ] Redis TTL
- [ ] MongoDB optional
- [ ] Elasticsearch/OpenSearch optional

## Distributed Systems

- [ ] RabbitMQ
- [ ] Consumer
- [ ] Producer
- [ ] Retry
- [ ] DLQ
- [ ] Idempotency
- [ ] Eventual consistency
- [ ] Outbox Pattern
- [ ] Kafka optional
- [ ] Saga optional

## Integrations

- [ ] Payment gateway
- [ ] Payment webhook
- [ ] Webhook signature verification
- [ ] OAuth
- [ ] Email
- [ ] Object storage
- [ ] WhatsApp optional

## Security

- [ ] JWT
- [ ] Refresh token
- [ ] RBAC
- [ ] Rate limiting
- [ ] CORS
- [ ] XSS awareness
- [ ] CSRF awareness
- [ ] SQL injection prevention
- [ ] SSRF awareness
- [ ] Secret management
- [ ] Audit logging

## Infrastructure

- [ ] Docker
- [ ] Docker Compose
- [ ] Multi-stage build
- [ ] Container health checks
- [ ] CI/CD
- [ ] Cloud deployment
- [ ] Kubernetes optional

## Observability

- [ ] Structured logging
- [ ] Request IDs
- [ ] Health checks
- [ ] Metrics
- [ ] Prometheus
- [ ] Grafana
- [ ] OpenTelemetry
- [ ] Distributed tracing

## AI

- [ ] LLM API
- [ ] Tool calling
- [ ] RAG
- [ ] Embeddings
- [ ] Vector search
- [ ] Guardrails
- [ ] AI evaluation
- [ ] AI observability

## Engineering

- [ ] ADRs
- [ ] API documentation
- [ ] Architecture documentation
- [ ] Failure testing
- [ ] Performance testing
- [ ] Security review
- [ ] Production deployment
- [ ] Portfolio README
