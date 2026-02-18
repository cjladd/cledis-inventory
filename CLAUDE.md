# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kitchen-Up Inventory (KUI)** — A phone-first restaurant inventory management app built with Next.js 15, Prisma/PostgreSQL, and NextAuth v5. It bridges the gap between Toast POS theoretical inventory and actual kitchen operations.

## Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Database
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Push schema to database (dev, no migration history)
npm run db:migrate   # Create and run migrations (production-safe)
npm run db:seed      # Seed database with sample data (tsx prisma/seed.ts)
npm run db:studio    # Open Prisma Studio GUI

# Code quality
npm run lint         # Run ESLint

# Build
npm run build        # Production build
```

No test runner is configured yet (see REMAINING_WORK.md).

## Architecture

### Stack
- **Next.js 15** App Router with TypeScript
- **Prisma 5.10** ORM with PostgreSQL
- **NextAuth v5 (beta)** — PIN-based login for restaurant staff; auth is **not yet implemented** (critical gap)
- **Zod** for request validation in API routes
- **Tailwind CSS** — mobile/touch-first UI (bottom nav, large tap targets)

### Key Directories
- `src/app/api/` — API routes (Next.js App Router route handlers)
- `src/app/` — Pages: `/` (dashboard), `/prep`, `/waste`, `/alerts`, `/settings`
- `src/components/` — `BottomNav`, `ItemCard`, `QuantityModal`, `AlertBanner`
- `src/lib/` — Shared server utilities
- `prisma/schema.prisma` — Single source of truth for all DB models

### Core Data Model (`prisma/schema.prisma`)

All entities belong to a `Location` (one restaurant = one location).

```
Location → User, InventoryItem, MenuItem, SaleEvent, AuditLog
InventoryItem → LiveAdjustment, Recipe, Alert, ForecastSnapshot
MenuItem → Recipe, SaleEvent
Recipe (join table) → InventoryItem + MenuItem with quantityUsed
```

**Stock calculation formula** (in `src/lib/inventory.ts` and duplicated in `src/app/api/inventory/route.ts`):
```
currentStock = parLevel + prepTotal - wasteTotal + manualTotal - salesDepletion
```
Where `salesDepletion` = sum over all recipes of `(menuItem.saleEvents.quantity × recipe.quantityUsed)`.

**Stock thresholds** (in `src/lib/utils.ts::getStockStatus`):
- `out`: currentStock ≤ 0
- `critical`: currentStock ≤ safetyStock
- `low`: currentStock ≤ parLevel × 0.5
- `ok`: otherwise

**Note**: `getStockStatus` is duplicated between `src/lib/utils.ts` and `src/lib/inventory.ts`.

### API Routes

| Route | Method | Description |
|---|---|---|
| `/api/inventory` | GET | List items with computed stock; supports `locationId`, `category`, `status`, `search`, `limit`, `offset` |
| `/api/inventory/prep` | POST | Log prep (adds stock); Zod-validated |
| `/api/inventory/waste` | POST | Log waste (removes stock); Zod-validated |
| `/api/inventory/alerts` | GET | Active alerts |
| `/api/inventory/alerts/[id]` | PATCH | Resolve/dismiss an alert |
| `/api/toast/webhook` | POST | Receive Toast POS webhooks; also GET for health check |

**Auth is not wired up yet** — prep/waste routes fall back to `prisma.user.findFirst()` as the userId.

### Toast POS Integration (`src/lib/toast-sdk.ts`)

Placeholder SDK that returns mock data when `TOAST_CLIENT_ID === "PLACEHOLDER_CLIENT_ID"`. Implements OAuth token caching, menu/order fetch, inventory write-back, and webhook signature verification (signature verification is a no-op stub in dev mode). Production use requires real credentials in `.env`.

Webhook flow: Toast sends `ORDER_CREATED/UPDATED/CLOSED` → webhook creates `SaleEvent` records → alert is triggered if `currentStock ≤ safetyStock`.

### Environment Variables

Copy `.env.example` to `.env`. Required:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- Toast vars (`TOAST_CLIENT_ID`, `TOAST_CLIENT_SECRET`, `TOAST_LOCATION_ID`, `TOAST_API_BASE_URL`, `TOAST_WEBHOOK_SECRET`) — optional for dev, use placeholder values

### Known Gaps (see `REMAINING_WORK.md`)

- **Authentication not implemented** — NextAuth setup, login page, session middleware, and role enforcement are all missing
- Admin CRUD routes (`/api/admin/*`) do not exist yet
- `ForecastSnapshot` model exists in schema but forecasting logic is not implemented
- Webhook HMAC signature verification is a stub
