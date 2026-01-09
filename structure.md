# StockPulse – Architecture & Environment Setup (Cursor-Ready)

This document defines the **complete structural architecture, environment setup, and conventions** for building **StockPulse**, a Shopify embedded app for out-of-stock recovery and demand tracking.

This file is designed to be given directly to **Cursor** so it can scaffold the project correctly.

---

## 1. Project Goals (Non‑Negotiable)

* Shopify embedded admin app (Polaris UI)
* Event‑driven architecture (webhooks → jobs → notifications)
* Accurate revenue attribution (no estimation)
* Scales from 1 store → 50,000+ stores without rewrite
* Boring, reliable, review‑safe tech

---

## 2. High‑Level Architecture

```
Shopify Admin (Embedded UI)
        ↓
Frontend (React + Polaris)
        ↓
Backend API (NestJS)
        ↓
PostgreSQL  ←→  Redis Queue (BullMQ)
        ↓
Notification Workers (Email / WhatsApp)
```

Key principles:

* Frontend = thin, read‑only + actions
* Backend = source of truth
* Jobs handle anything async
* Webhooks are never processed inline

---

## 3. Tech Stack (Locked In)

### Frontend

* React
* Shopify Polaris
* Shopify App Bridge
* TypeScript

### Backend

* Node.js (18+)
* NestJS (TypeScript)
* REST APIs

### Database

* PostgreSQL
* Prisma ORM

### Background Jobs

* BullMQ
* Redis (Upstash / ElastiCache)

### Notifications

* Email: Postmark or Resend
* WhatsApp/SMS: Twilio (abstracted)

### Infra (initial)

* Fly.io OR AWS App Runner
* PostgreSQL (managed)
* Redis (managed)

### Observability

* Sentry (errors)
* Pino logger

---

## 4. Repository Structure (Monorepo)

```
stockpulse/
│
├── apps/
│   ├── web/                 # Shopify embedded frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   └── main.tsx
│   │   └── package.json
│   │
│   ├── api/                 # Backend (NestJS)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── shop/
│   │   │   │   ├── product/
│   │   │   │   ├── demand/
│   │   │   │   ├── notification/
│   │   │   │   ├── webhook/
│   │   │   │   └── recovery/
│   │   │   ├── jobs/
│   │   │   ├── prisma/
│   │   │   ├── common/
│   │   │   └── main.ts
│   │   └── package.json
│
├── packages/
│   ├── shared/              # Shared types & utils
│   └── config/              # ESLint, TS, env schemas
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 5. Core Domain Concepts

### Entities

* Shop
* Product
* Variant
* DemandRequest
* NotificationEvent
* RecoveryLink
* OrderAttribution

Relationships are **relational and strict** (Postgres).

---

## 6. Database Model (Logical)

### Shop

* id
* shopifyDomain
* accessToken (encrypted)
* createdAt

### Product

* id
* shopId
* shopifyProductId
* title
* imageUrl

### Variant

* id
* productId
* shopifyVariantId
* inventoryQuantity

### DemandRequest

* id
* variantId
* contact
* channel (EMAIL | WHATSAPP)
* status (PENDING | NOTIFIED | CONVERTED)
* createdAt

### RecoveryLink

* id
* demandRequestId
* token
* expiresAt

### OrderAttribution

* id
* orderId
* shopId
* recoveryLinkId
* revenue
* createdAt

---

## 7. Webhook Strategy (Critical)

### Required Webhooks

* inventory_levels/update
* products/update
* orders/create
* app/uninstalled

### Rules

* All webhooks must be HMAC‑verified
* Webhooks enqueue jobs only
* No business logic inside controllers

---

## 8. Job Processing

### Job Types

* HandleRestockJob
* SendNotificationJob
* ExpireRecoveryLinksJob

### Queue Rules

* Idempotent jobs
* Retry with backoff
* Dead‑letter logging

---

## 9. Notification Abstraction

Use a provider interface:

```
NotificationProvider
- sendEmail()
- sendWhatsApp()
```

Backend calls provider without knowing implementation.

---

## 10. Revenue Attribution Rules

Recovered revenue is counted ONLY if:

* Order was created via recovery link
* Token is valid
* Product/variant matches
* Order within attribution window (e.g. 7 days)

No estimation. No guessing.

---

## 11. Frontend Rules (Polaris)

* Use Polaris components only
* No custom UI kits
* No charts in MVP
* Dashboard answers:

  1. Products with demand
  2. Buyers waiting
  3. Revenue recovered

---

## 12. Environment Variables

```
DATABASE_URL=
REDIS_URL=
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=
POSTMARK_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
APP_URL=
FRONTEND_URL=

# Notification Feature Flags (Non-Negotiable)
ENABLE_NOTIFICATIONS=false  # Set to 'true' to enable actual sending
EMAIL_PROVIDER=postmark      # Provider selection (future use)
SMS_PROVIDER=twilio          # Provider selection (future use)
```

---

## 13. Local Development

* Node 18+
* Docker for Postgres + Redis
* Shopify CLI for app setup

Commands:

```
npm install
npm run dev
```

---

## 14. Non‑Goals (Do NOT Build)

* AI forecasting
* Complex charts
* Multi‑store dashboards
* Over‑engineered microservices

---

## 15. Success Criteria

* Shopify app review passes first attempt
* Merchant understands value in <10 seconds
* Revenue attribution is auditable
* No rewrites required at scale

---

END OF ARCHITECTURE DOCUMENT
