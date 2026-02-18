# Copilot Instructions for Kitchen-Up Inventory (KUI)

## Project Overview

**Kitchen-Up Inventory** is a real-time operational inventory manager for restaurants. It bridges the gap between POS theoretical inventory (what Toast says) and operational inventory (what's actually in the kitchen).

**Key Mission**: Staff tap to log "Live Prep" and "Live Waste" in real-time → system predicts stockouts → alerts notify chef.

**Stack**: Next.js 14 App Router + TypeScript + Prisma + PostgreSQL + Tailwind

---

## Architecture Essentials

### Data Model Core

The system centers on **three core relationships**:

1. **Toast Integration Layer** (Location → MenuItem)
   - `Location`: single restaurant (stores Toast credentials, alert window)
   - `MenuItem`: Toast menu items (linked via `toastMenuItemId`)
   - `SaleEvent`: orders from Toast (decrements stock via Recipe yields)

2. **Inventory Tracking** (InventoryItem ← Recipe ← MenuItem)
   - `InventoryItem`: what we track (salsa, chicken, etc.)
   - `Recipe`: "Chicken Tacos" use 0.25 lb chicken (binds MenuItem → InventoryItem)
   - `LiveAdjustment`: staff logging (PREP adds, WASTE subtracts, MANUAL adjusts)

3. **Operational State**
   - **Current Stock** = `parLevel` + prep adjustments − waste adjustments − sales depletion
   - **Stock Status** = `ok` | `low` | `critical` | `out` (based on thresholds vs. `parLevel`, `safetyStock`)
   - **Alerts**: Auto-created when stock hits `safetyStock` or predicted to run out within `alertWindowMinutes`

### Calculation Pattern

**Stock calculations are centralized in `src/lib/inventory.ts`**. Always use `calculateCurrentStock(itemId)` to get consistent results across API and UI. It aggregates:
- Sum of PREP adjustments (additions)
- Sum of WASTE adjustments (subtractions)
- Sum of MANUAL adjustments
- Sales depletion from Recipe usage rates

Example:
```typescript
const { currentStock, status } = await calculateCurrentStock(itemId);
// Returns { currentStock: 12.5, status: "low", prepTotal: 5, wasteTotal: 2, ... }
```

---

## File Structure & Responsibilities

```
src/
├── app/
│   ├── api/
│   │   ├── inventory/          # Core inventory endpoints
│   │   │   ├── route.ts        # GET items with current stock
│   │   │   ├── prep/route.ts   # POST live prep logging
│   │   │   ├── waste/route.ts  # POST live waste + auto-alert creation
│   │   │   └── alerts/[id]/    # PATCH alert status
│   │   └── toast/webhook/      # POST receives Toast order events
│   ├── page.tsx                # Dashboard (quick actions, top alerts)
│   ├── prep/page.tsx           # Search & log prep (staff main workflow)
│   ├── waste/page.tsx          # Search & log waste with reason codes
│   ├── alerts/page.tsx         # Alert list, resolve/dismiss actions
│   └── settings/page.tsx       # Config (Toast creds, alert window) — NEEDS AUTH
│
├── components/
│   ├── BottomNav.tsx           # Fixed nav bar (Home, Prep, Waste, Alerts, Settings)
│   ├── ItemCard.tsx            # Item display with status badge
│   ├── QuantityModal.tsx       # Modal for entering qty (+/− buttons, quick-add 1/5/10/25)
│   └── AlertBanner.tsx         # "Low Stock Alert" banner with item list
│
└── lib/
    ├── prisma.ts              # Singleton Prisma client
    ├── toast-sdk.ts           # Toast API wrapper (PLACEHOLDER: uses mock data)
    ├── inventory.ts           # Stock calculations, depletion forecasting
    └── utils.ts               # Formatting, status helpers
```

---

## Key Conventions & Patterns

### 1. API Route Error Handling

All API routes use Zod for validation and return JSON responses:
```typescript
import { z } from "zod";

const PrepSchema = z.object({ itemId: z.string().min(1), quantity: z.number().positive() });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = PrepSchema.parse(body);  // Zod throws ZodError if invalid
    // ... process
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

### 2. Stock Status Classification

Use `getStockStatus(currentStock, parLevel, safetyStock)`:
- `out`: currentStock ≤ 0
- `critical`: currentStock ≤ safetyStock
- `low`: currentStock ≤ parLevel × 0.5
- `ok`: else

### 3. Toast Webhook Idempotency

`POST /api/toast/webhook` checks for duplicate `toastOrderId` before creating `SaleEvent`:
```typescript
const existing = await prisma.saleEvent.findFirst({ where: { toastOrderId: orderGuid } });
if (existing) { console.log("Order already processed"); return; }
```

This prevents double-decrementing from webhook retries.

### 4. Audit Trail for Compliance

Every inventory change creates an `AuditLog` entry (user, action, entity, details, timestamp). See `/api/inventory/prep` for example.

### 5. UI Component Props

Components accept data directly, not async fetching:
- `ItemCard` takes `{ name, currentStock, unit, status, category?, onClick? }`
- `QuantityModal` takes `{ isOpen, onClose, onSubmit, itemName, unit, mode: "add"|"subtract"|"set" }`
- Pages handle fetching in `useEffect`, pass results to components

---

## Development Workflow

### Database Setup
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to DB
npm run db:seed        # Populate test data (20 items, 2 users)
npm run db:studio      # Open Prisma visual editor
```

### Running Dev Server
```bash
npm run dev            # http://localhost:3000
```

### Adding New Features

1. **Extend schema** → Edit `prisma/schema.prisma`, run `npm run db:push`
2. **Add calculation logic** → Update `src/lib/inventory.ts` with new util
3. **Create API route** → `src/app/api/[feature]/route.ts` with Zod validation
4. **Build UI** → Page in `src/app/[feature]`, use shared components

---

## Immediate Priorities (See REMAINING_WORK.md)

**Critical before production**:
1. **Authentication**: NextAuth.js setup + PIN login + role enforcement
2. **Admin pages**: Settings for items, recipes, users, Toast credentials

**High impact**:
- Admin CRUD endpoints (POST `/api/admin/items`, `/api/admin/recipes`, etc.)
- Reconciliation page (variance review + optional write-back to Toast)
- Forecasting worker (update `ForecastSnapshot` with moving averages)

---

## Toast Integration Notes

**Placeholder status**: All Toast API calls use mock data until credentials provided.

**When credentials added**:
- Set `TOAST_CLIENT_ID`, `TOAST_CLIENT_SECRET`, `TOAST_LOCATION_ID` in `.env`
- Webhook signature verification in `toast-sdk.ts` will activate
- Real menu fetch and order processing will begin

**Key endpoints ready**:
- `POST /api/toast/webhook` → handles `order_updated`, auto-decrements stock, creates alerts
- `src/lib/toast-sdk.ts` → Auth, menu fetch, inventory write-back (see `updateInventoryCount()`)

---

## Testing Your Changes

- **Stock calculations**: Seed DB, call `calculateCurrentStock()` from `src/lib/inventory.ts`
- **API routes**: Use cURL or Postman; test Zod validation with invalid data
- **Webhooks**: Mock payload in `toast-sdk.ts` comments or use Toast webhook tester

---

## File References for Common Tasks

| Task | Primary Files |
|------|---|
| Add inventory item field | `prisma/schema.prisma`, `src/lib/inventory.ts` |
| Add API endpoint | `src/app/api/[feature]/route.ts` (see `prep/route.ts` as template) |
| Add UI page | `src/app/[page]/page.tsx` (see `prep/page.tsx` as template) |
| Fix stock calculation | `src/lib/inventory.ts` (`calculateCurrentStock`) |
| Update Toast integration | `src/lib/toast-sdk.ts` |
| Adjust UI theme | `tailwind.config.ts`, `src/app/globals.css` |
| Modify database | `prisma/schema.prisma` → `npm run db:push` |

---

## Agentic Development Notes

This codebase is optimized for AI agents:
- **Type safety**: Full TypeScript, Prisma-generated types
- **Clear boundaries**: API routes, components, lib functions are isolated
- **Shared utilities**: All stock calculations centralized (no duplicated logic)
- **Predictable structure**: pages, components, lib follow Next.js conventions
- **Mock data support**: Toast SDK returns realistic mock data for offline development

When working on features, prefer **modifying existing patterns** over introducing new ones.
