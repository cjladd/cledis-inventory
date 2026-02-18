# Implementation Plan — Kitchen-Up Inventory (KUI)

## Phase 1: Project Scaffold (Steps 1-3)
### Step 1: Initialize Next.js project
- Create Next.js 14 app with TypeScript
- Configure Tailwind CSS
- Set up folder structure

### Step 2: Configure Prisma + Database
- Initialize Prisma with PostgreSQL
- Create .env with placeholder DATABASE_URL
- Design and create schema

### Step 3: Set up Auth
- Install NextAuth.js
- Configure credentials provider (PIN-based for staff)
- Create user roles enum

---

## Phase 2: Database Schema (Steps 4-5)
### Step 4: Core entities
- User (roles: ADMIN, MANAGER, STAFF)
- Location (Toast credentials placeholders)
- InventoryItem (par levels, units)
- MenuItem (Toast menu mapping)
- Recipe (menu item → inventory breakdown)

### Step 5: Operational entities
- LiveAdjustment (prep, waste, manual)
- SaleEvent (from Toast webhooks)
- Alert (predictive stockout)
- AuditLog (all changes)

---

## Phase 3: API Layer (Steps 6-9)
### Step 6: Auth endpoints
- POST /api/auth/[...nextauth] (login, session)
- Middleware for role-based access

### Step 7: Inventory endpoints
- GET /api/inventory — list items with current counts
- POST /api/inventory/prep — log live prep
- POST /api/inventory/waste — log live waste
- GET /api/inventory/alerts — get active alerts

### Step 8: Admin endpoints
- CRUD for inventory items, recipes, users
- Location settings

### Step 9: Toast integration endpoints (placeholders)
- POST /api/toast/webhook — receive order updates
- GET /api/toast/menu — fetch menu (placeholder)
- POST /api/toast/sync — write-back inventory

---

## Phase 4: UI Layer (Steps 10-14)
### Step 10: Layout + Navigation
- Mobile-first responsive layout
- Bottom nav: Home, Prep, Waste, Alerts, Settings

### Step 11: Home Dashboard
- Quick action buttons
- Top 5 low-stock items
- Recent activity

### Step 12: Live Prep Screen
- Item search/filter
- Tap item → quantity modal → submit
- Success feedback

### Step 13: Live Waste Screen
- Same flow as prep
- Reason code selector (spoilage, over-prep, misfire)

### Step 14: Alerts Screen
- List of items nearing stockout
- ETA to zero
- Resolve/assign actions

### Step 15: Admin/Settings
- User management
- Item management
- Toast credentials (placeholder inputs)

---

## Phase 5: Toast SDK Placeholder (Step 16)
### Step 16: Create Toast client wrapper
- lib/toast-sdk.ts with placeholder functions
- Environment variables for CLIENT_ID, CLIENT_SECRET, LOCATION_ID
- Mock responses for development

---

## Phase 6: Self-Review + Polish (Steps 17-18)
### Step 17: Sub-agent review
- Schema review agent
- API review agent
- UI review agent
- Synthesize feedback, fix issues

### Step 18: Final touches
- Error handling
- Loading states
- README with setup instructions

---

## File Structure Target
```
cledis-inventory/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── inventory/route.ts
│   │   │   ├── inventory/prep/route.ts
│   │   │   ├── inventory/waste/route.ts
│   │   │   ├── inventory/alerts/route.ts
│   │   │   ├── admin/[...]/route.ts
│   │   │   └── toast/webhook/route.ts
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx (home)
│   │   │   ├── prep/page.tsx
│   │   │   ├── waste/page.tsx
│   │   │   ├── alerts/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/ (buttons, modals, inputs)
│   │   ├── BottomNav.tsx
│   │   ├── ItemCard.tsx
│   │   ├── QuantityModal.tsx
│   │   └── AlertBanner.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── toast-sdk.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```
