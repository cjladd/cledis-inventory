# Plan: Make KUI Presentation-Ready

## Context
Kitchen-Up Inventory (KUI) needs to look polished for a demo to non-technical stakeholders so you can get Toast API access. The goal is to do everything possible before the API is connected — fix bugs, fill in missing pages, add realistic demo data, and make the whole flow work end-to-end.

## Execution Order (8 phases)

---

### Phase 1: Fix Build-Breaking Dependency Bug
**Install missing packages that `src/lib/utils.ts` already imports:**
- `npm install clsx tailwind-merge react-hot-toast`

---

### Phase 2: Seed Data Enhancement
**File:** `prisma/seed.ts`

Make the demo look alive with realistic, varied data:
- **Complete all 5 menu item recipes** (currently only 2 of 5 have ingredient mappings)
  - Chicken Tacos: add corn tortillas
  - Beef Burrito: beef, flour tortillas, rice, beans, cheese, sour cream
  - Carnitas Bowl: carnitas, rice, beans, lettuce, cheese, salsa, sour cream
  - Chips & Guacamole: chips, guacamole
- **Add LiveAdjustment records** to create varied stock levels:
  - ~8 items OK (stock well above par)
  - ~7 items Low (stock at 40-50% of par)
  - ~3 items Critical (stock near safetyStock)
  - ~2 items Out (stock at 0)
- **Add 3 active alerts + 1 resolved alert** for the critical/out items
- **Add 5-8 sample SaleEvent records** so sales depletion is visible
- **Add 10-15 prep/waste history entries** spread over last 2 days with realistic notes

---

### Phase 3: Consolidate Stock Calculation (Bug Fix)
Stock calc is duplicated in 3 API routes with inconsistencies (some miss MANUAL adjustments, some miss sales depletion).

- **`src/lib/inventory.ts`** — Add a `computeStockFromData()` batch helper that takes pre-fetched Prisma data (avoids N+1 queries)
- **`src/app/api/inventory/route.ts`** — Replace inline calc with `computeStockFromData()`
- **`src/app/api/inventory/alerts/route.ts`** — Replace inline calc (currently missing MANUAL + sales)
- **`src/app/api/inventory/waste/route.ts`** — Use `calculateCurrentStock()` from inventory.ts
- **`src/app/api/toast/webhook/route.ts`** — Use `calculateCurrentStock()` from inventory.ts
- **`src/lib/utils.ts`** — Remove duplicate `getStockStatus` (keep only the one in `inventory.ts`)

---

### Phase 4: Simple PIN Login
Non-technical people expect a login screen. Simple localStorage-based auth (not full NextAuth — that's for when Toast is connected).

**New files:**
- `src/lib/auth.ts` — Client-side helpers: `getUser()`, `setUser()`, `logout()`, `isLoggedIn()`
- `src/app/login/page.tsx` — PIN entry screen (4-digit, emerald-themed, error shake)
- `src/app/api/auth/login/route.ts` — POST endpoint that validates PIN against bcrypt hash in DB

**Modified files:**
- `src/app/layout.tsx` — Add `AuthGuard` wrapper that redirects to `/login` if not logged in; add `<Toaster />` for react-hot-toast; hide BottomNav on login page
- `src/app/settings/page.tsx` — Show logged-in user name + logout button

---

### Phase 5: Dashboard Polish
The dashboard is the first thing stakeholders see after login.

**Modified file:** `src/app/page.tsx`
- Add greeting header: "Good morning, [user name]" with current date
- Add KPI summary cards in a 2x2 grid: Total Items, Low Stock, Active Alerts, Today's Preps
- Improve "Attention Needed" section — sort by severity

**New file:** `src/app/api/inventory/stats/route.ts`
- Single endpoint returning aggregate counts (avoids fetching all items client-side)

---

### Phase 6: Admin CRUD Pages (eliminate 404s)
Settings links to `/settings/items`, `/settings/recipes`, `/settings/users` — all currently 404.

**New files:**
- `src/app/settings/items/page.tsx` — List/add/edit inventory items (table + modal form)
- `src/app/settings/recipes/page.tsx` — View menu items with their recipe ingredient mappings, add/remove ingredients
- `src/app/settings/users/page.tsx` — View team members list (read-only for demo)
- `src/app/api/admin/items/route.ts` — GET/POST/PATCH/DELETE for inventory items
- `src/app/api/admin/recipes/route.ts` — GET/POST/DELETE for recipes
- `src/app/api/admin/users/route.ts` — GET users list

---

### Phase 7: Settings Page Completion
**Modified file:** `src/app/settings/page.tsx`
- Add Toast integration status card (green "Connected" or yellow "Demo Mode — Using Simulated Data")
- Wire save button to persist settings via API
- Show logged-in user info + logout

**New file:** `src/app/api/settings/route.ts`
- GET/POST for location settings (alert window, write-back toggle)

---

### Phase 8: UI Polish + Cleanup
- **Replace inline success messages** in prep/waste pages with `react-hot-toast` calls
- **Add error states** with retry buttons to all pages
- **Delete stale duplicate directories:** `app/`, `components/`, `lib/prisma.ts` (root-level copies that shadow the real `src/` files)

---

## Files Summary

**New files (11):**
1. `src/app/login/page.tsx`
2. `src/app/api/auth/login/route.ts`
3. `src/lib/auth.ts`
4. `src/app/api/inventory/stats/route.ts`
5. `src/app/settings/items/page.tsx`
6. `src/app/settings/recipes/page.tsx`
7. `src/app/settings/users/page.tsx`
8. `src/app/api/admin/items/route.ts`
9. `src/app/api/admin/recipes/route.ts`
10. `src/app/api/admin/users/route.ts`
11. `src/app/api/settings/route.ts`

**Modified files (10):**
1. `prisma/seed.ts`
2. `src/lib/inventory.ts`
3. `src/lib/utils.ts`
4. `src/app/api/inventory/route.ts`
5. `src/app/api/inventory/alerts/route.ts`
6. `src/app/api/inventory/waste/route.ts`
7. `src/app/api/toast/webhook/route.ts`
8. `src/app/page.tsx`
9. `src/app/settings/page.tsx`
10. `src/app/layout.tsx`

**Deleted (stale duplicates):**
- `app/` directory
- `components/` directory
- `lib/prisma.ts`

## Verification
1. `npm install` — should succeed with new deps
2. `npm run build` — should compile without errors
3. `npx prisma db push && npm run db:seed` — seed data populates
4. `npm run dev` — app starts, login page appears
5. Enter PIN 1234 → dashboard with KPI cards and varied stock data
6. Navigate through all pages — no 404s
7. Log prep/waste → stock updates, alerts trigger
8. Settings → Toast status shows "Demo Mode", save works
9. Admin pages → items/recipes/users all load with data

## Demo Script (What to show stakeholders)
1. Open app → see login screen with "Kitchen-Up Inventory" branding
2. Enter PIN 1234 → logs in as "Kitchen Manager"
3. Dashboard shows: "Good morning, Kitchen Manager" + 4 KPI cards (20 items, 5 low stock, 3 alerts)
4. Tap "Log Prep" → see item list with varied stock levels, search for "Salsa", tap it, add 5 qt
5. Return to dashboard → see stock update reflected
6. Go to Alerts → see 3 active alerts with real item data, resolve one
7. Go to Settings → see Toast Integration showing "Demo Mode", manage items/recipes links work
8. Tap "Manage Inventory Items" → see full item list, add a new item
9. Tap "Manage Recipes" → see all 5 menu items mapped to ingredients
10. Log out
