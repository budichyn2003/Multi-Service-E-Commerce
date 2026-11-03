# MarketForge — Architecture Deep-Dive & Flow Diagrams

This document provides detailed sequence diagrams and flow specifications for the primary interactions across MarketForge's polyglot microservices.

---

## 1. User Authentication & Session Flow

All authentication traffic enters through the **API Gateway** (`apps/gateway`), which handles password verification, JWT issuance, and token refresh.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / Browser
    participant Gateway as API Gateway (:8080)
    participant DB as PostgreSQL (commerce.users)
    participant Redis as Redis (:6379)

    Note over User,Gateway: 1. User Registration / Login
    User->>Gateway: POST /api/v1/auth/login { email, password }
    Gateway->>DB: SELECT id, password_hash, role, status FROM commerce.users WHERE email = $1
    DB-->>Gateway: user record
    Gateway->>Gateway: bcrypt.compare(password, password_hash)
    Gateway->>Gateway: Generate Access JWT (15m) & Refresh Token (30d)
    Gateway->>Redis: SETEX refresh_token:{sub} 30d
    Gateway-->>User: 200 OK { user, accessToken, refreshToken }

    Note over User,Gateway: 2. Authenticated Request with Identity Injection
    User->>Gateway: GET /api/v1/cart (Bearer accessToken)
    Gateway->>Gateway: Verify JWT signature & expiration
    Gateway->>Gateway: Inject X-User-Id, X-User-Role, X-Request-Id, X-Internal-Token
    Gateway->>DB: Downstream request forwarded with trusted internal headers

    Note over User,Gateway: 3. Token Refresh on Expiry
    User->>Gateway: Request returns 401 UNAUTHORIZED
    User->>Gateway: POST /api/v1/auth/refresh { refreshToken }
    Gateway->>Gateway: Verify refresh JWT
    Gateway-->>User: 200 OK { accessToken, refreshToken }
```

---

## 2. Product Catalog, Search & Cache-Aside Flow

The Core Commerce Service (`apps/commerce-go`) serves the product catalog with Redis caching and explicit invalidation.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Storefront User
    participant Gateway as API Gateway (:8080)
    participant Commerce as Commerce-Go (:8081)
    participant Redis as Redis (:6379)
    participant DB as PostgreSQL (commerce.products)

    Customer->>Gateway: GET /api/v1/products/{slug}
    Gateway->>Commerce: GET /api/v1/products/{slug}
    Commerce->>Redis: GET product:slug:{slug}
    alt Cache Hit
        Redis-->>Commerce: Cached Product JSON
        Commerce-->>Customer: 200 OK { success: true, data: product }
    else Cache Miss
        Redis-->>Commerce: nil
        Commerce->>DB: Query product, category, inventory, images
        DB-->>Commerce: Product record
        Commerce->>Redis: SETEX product:slug:{slug} 300 (5 min TTL)
        Commerce-->>Customer: 200 OK { success: true, data: product }
    end

    Note over Gateway,DB: Product Modification by Admin
    actor Admin as Admin User
    Admin->>Gateway: PATCH /api/v1/admin/products/{id} (Bearer Admin Token)
    Gateway->>Commerce: PATCH /api/v1/admin/products/{id}
    Commerce->>DB: UPDATE commerce.products SET ...
    Commerce->>Redis: DEL product:{id} product:slug:{slug}
    Commerce-->>Admin: 200 OK { success: true, data: updatedProduct }
```

---

## 3. End-to-End Checkout & Transaction Flow

The transactional core coordinates between `order-service` and `commerce-go` to guarantee price authority and inventory reservation.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Next.js)
    participant Gateway as API Gateway (:8080)
    participant Orders as Order-Service (:8082)
    participant Commerce as Commerce-Go (:8081)
    participant DB as PostgreSQL (orders schema)
    participant Rabbit as RabbitMQ (:5672)

    Customer->>Gateway: POST /api/v1/orders { items: [{productId, quantity}], shippingAddressJson }
    Gateway->>Orders: Forward with X-User-Id, X-Request-Id

    Note over Orders,Commerce: Step 1: Authoritative Price Quote
    Orders->>Commerce: POST /internal/products/quote { items } (X-Internal-Token)
    Commerce-->>Orders: List of verified items with current prices & names

    Note over Orders,Commerce: Step 2: Atomic Inventory Reservation
    Orders->>Commerce: POST /inventory/reserve { orderId, items }
    Commerce->>Commerce: Sort items by productId (deadlock prevention)
    Commerce->>Commerce: SELECT ... FOR UPDATE on commerce.inventory
    Commerce->>Commerce: Check available_quantity >= requested
    Commerce->>Commerce: UPDATE inventory SET available_quantity -= qty, reserved_quantity += qty
    Commerce->>Commerce: INSERT INTO commerce.reservations (ACTIVE, 15m TTL)
    Commerce-->>Orders: 200 OK (Reservation successful)

    Note over Orders,DB: Step 3: Order Persistence
    Orders->>DB: INSERT INTO orders.orders (status: PENDING_PAYMENT)
    Orders->>DB: INSERT INTO orders.order_items (frozen prices snapshot)
    Orders->>DB: INSERT INTO orders.order_history (from: null, to: PENDING_PAYMENT)
    Orders->>Rabbit: Publish "order.created"
    Orders-->>Customer: 201 Created { orderNumber, totalAmount, status: "PENDING_PAYMENT" }
```

---

## 4. Payment Lifecycle & Reservation Confirmation

MarketForge supports sandbox payment sessions with instant simulation or asynchronous webhook callbacks.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Next.js)
    participant Gateway as API Gateway (:8080)
    participant Orders as Order-Service (:8082)
    participant Commerce as Commerce-Go (:8081)
    participant Rabbit as RabbitMQ (:5672)
    participant Notif as Notification-Service (:8083)

    Customer->>Gateway: POST /api/v1/orders/{orderNumber}/payments
    Gateway->>Orders: Forward payment initiation
    Orders->>Orders: Generate Payment session (15m expiry, PENDING)
    Orders-->>Customer: 201 Created { paymentId, checkoutUrl, expiresAt }

    alt Sandbox Simulation Triggered
        Customer->>Gateway: POST /api/v1/payments/{paymentId}/simulate-success
        Gateway->>Orders: Forward simulation command
    else External Webhook Callback
        actor Provider as Payment Gateway
        Provider->>Gateway: POST /api/v1/payments/webhook
        Gateway->>Orders: Forward webhook (verify X-Callback-Signature)
    end

    Note over Orders: Idempotent Payment Processing
    Orders->>Orders: Record webhook event / verify idempotency key
    Orders->>Orders: UPDATE payments.payments SET status = 'SUCCESS'
    Orders->>Orders: UPDATE orders.orders SET status = 'PAID'
    Orders->>Orders: INSERT INTO orders.order_history (transition: PAID)

    Note over Orders,Commerce: Confirm Inventory Reservation
    Orders->>Commerce: POST /inventory/confirm { orderId }
    Commerce->>Commerce: UPDATE commerce.inventory SET reserved_quantity -= qty, sold_quantity += qty
    Commerce->>Commerce: UPDATE commerce.reservations SET status = 'CONFIRMED'
    Commerce-->>Orders: 200 OK

    Note over Orders,Notif: Event-Driven Notifications
    Orders->>Rabbit: Publish "order.paid" event
    Rabbit-->>Notif: Consume "order.paid"
    Notif->>Notif: Render ORDER_PAID email template
    Notif->>Notif: Send email via SMTP (MailHog)
    Notif->>Notif: Record delivery_attempt in DB
    Orders-->>Customer: 200 OK { status: "PAID" }
```

---

## 5. AI Assistant Tool Calling Architecture

The AI assistant never queries the database directly. It extracts intent, validates questions against safety guardrails, and executes internal API tools carrying the authenticated user's identity.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as User (Web Chat UI)
    participant Gateway as API Gateway (:8080)
    participant AI as AI-Service (:8084)
    participant Commerce as Commerce-Go (:8081)
    participant Orders as Order-Service (:8082)

    Customer->>Gateway: POST /api/v1/assistant/chat { message: "Status pesanan saya ORD-123 bagaimana?" }
    Gateway->>AI: Forward with X-User-Id, Authorization

    AI->>AI: validate_question(message) — guardrail check
    AI->>AI: Detect intent: ["get_order_status"]

    opt Tool Execution
        AI->>Orders: GET /api/v1/orders/ORD-123 (with X-User-Id forwarded)
        Orders-->>AI: Order details { status: "SHIPPED", items, tracking }
    end

    AI->>AI: Compose response with order details
    AI->>AI: sanitize_answer(answer) — redact sensitive data
    AI-->>Customer: 200 OK { answer: "Pesanan ORD-123 Anda berstatus SHIPPED...", tools_used: ["get_order_status"] }
```
