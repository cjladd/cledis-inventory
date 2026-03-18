# Kitchen-Up Inventory (KUI) — Master Implementation Plan

## Context

KUI is a phone-first restaurant inventory management app (~60% complete). The UI and core stock logic are fully built and functional. What remains is security (auth), real integrations (Toast POS), intelligence (forecasting), and production infrastructure. This plan is the single source of truth for AI agents building out the remaining features.

## Decisions Made

- **Auth**: NextAuth v5 with credentials provider, PIN-based login, server sessions + HTTP-only cookies
- **Deployment**: Vercel
- **Database hosting**: TBD (recommend Neon — free tier, serverless, native Vercel integration)
- **Scope**: Single-location MVP; architect for multi-location later
- **Forecasting**: Critical for MVP — moving averages + day-of-week seasonality
- **User management**: Full CRUD required
- **Toast POS**: Plan for real integration; credentials not yet available; placeholder mode must keep working
- **Testing**: Vitest (modern, fast, native ESM, works with Next.js)

## Conventions (follow existing patterns)

- **API validation**: Zod schemas at top of route files
- **Database**: Always use `prisma` singleton from `src/lib/prisma.ts`
- **Location scoping**: Currently hardcoded `LOCATION_ID = "loc-1"` — Phase 1 replaces this with session-derived locationId
- **Error responses**: `NextResponse.json({ error: "message" }, { status: code })`
- **Success responses**: `NextResponse.json({ data })` or `NextResponse.json({ success: true, ... })`
- **Client pages**: `"use client"` directive, fetch in useEffect, loading/error states
- **Notifications**: `react-hot-toast` (toast.success / toast.error)
- **Styling**: Tailwind CSS, mobile-first, emerald primary color, rounded-xl cards
- **Components**: Functional components, no class components
- **Types**: Inline in each file (no shared types file currently)

---

## Phase 1: Authentication & Authorization

**Goal**: Replace localStorage auth with NextAuth v5 server sessions. Protect all API routes. Enforce role-based access.

**Prerequisites**: None (first phase)

### Tasks

#### 1.1 Create NextAuth v5 configuration

**Create `src/lib/auth.config.ts`** (NEW FILE):
```
- Export authConfig with credentials provider
- Provider: validate email + PIN via bcrypt (move logic from /api/auth/login/route.ts)
- Session strategy: "jwt" (works best with Vercel/edge)
- Callbacks:
  - jwt: attach user.id, user.role, user.locationId to token
  - session: expose id, role, locationId on session.user
- Pages: { signIn: "/login" }
```

**Create `src/auth.ts`** (NEW FILE, project root src/):
```
- Import NextAuth from "next-auth"
- Import authConfig
- Export { auth, handlers, signIn, signOut } = NextAuth(authConfig)
```

**Create `src/app/api/auth/[...nextauth]/route.ts`** (NEW FILE):
```
- Import { handlers } from "@/auth"
- Export { handlers.GET as GET, handlers.POST as POST }
```

#### 1.2 Create auth middleware

**Create `src/middleware.ts`** (NEW FILE):
```
- Import { auth } from "@/auth"
- Export default auth
- Protect all routes except: /login, /api/auth/*, /_next/*, /favicon.ico, /manifest.json
- Redirect unauthenticated users to /login
- Export config.matcher to exclude static assets
```

#### 1.3 Create server-side auth helpers

**Rewrite `src/lib/auth.ts`**:
```
- Keep SessionUser type (id, name, email, role, locationId)
- Add getSession(): server-side function that calls auth() from @/auth
- Add requireAuth(): throws/redirects if no session
- Add requireRole(role: Role | Role[]): checks session role
- Add getLocationId(): returns locationId from session
- Keep client-side getUser/setUser/logout/isLoggedIn BUT mark as deprecated
  (needed during transition; AuthGuard still uses them)
```

#### 1.4 Create API auth utilities

**Create `src/lib/api-auth.ts`** (NEW FILE):
```
- getApiSession(request): extract session from request using auth()
- requireApiAuth(request): return session or NextResponse 401
- requireApiRole(request, role): return session or NextResponse 403
- getApiLocationId(request): return locationId from session
```

#### 1.5 Protect all API routes

**Modify every route in `src/app/api/`** (EXCEPT /api/auth/*):
- Add `const session = await requireApiAuth(request)` at top of each handler
- Replace hardcoded `LOCATION_ID = "loc-1"` with `session.user.locationId`
- Replace `prisma.user.findFirst()` fallback with `session.user.id`
- Role enforcement:
  - `/api/admin/*` routes: require ADMIN or MANAGER role
  - `/api/settings` POST: require ADMIN or MANAGER role
  - `/api/inventory/prep`, `/api/inventory/waste`: require any authenticated user
  - `/api/inventory` GET, `/api/inventory/alerts` GET, `/api/inventory/stats` GET: require any authenticated user

**Files to modify:**
- `src/app/api/inventory/route.ts`
- `src/app/api/inventory/prep/route.ts`
- `src/app/api/inventory/waste/route.ts`
- `src/app/api/inventory/alerts/route.ts`
- `src/app/api/inventory/alerts/[id]/route.ts`
- `src/app/api/inventory/stats/route.ts`
- `src/app/api/admin/items/route.ts`
- `src/app/api/admin/recipes/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/toast/webhook/route.ts` (webhook uses signature verification, NOT session auth)

#### 1.6 Update login page

**Modify `src/app/login/page.tsx`**:
- Replace direct fetch to /api/auth/login with NextAuth `signIn("credentials", { email, pin })`
- Remove localStorage setUser() call
- Handle signIn result (redirect on success, show error on failure)

#### 1.7 Update AuthGuard

**Modify `src/components/AuthGuard.tsx`**:
- Use `useSession()` from `next-auth/react` instead of localStorage isLoggedIn()
- Wrap app with `<SessionProvider>` in layout.tsx
- Remove localStorage dependency

**Modify `src/app/layout.tsx`**:
- Wrap children with SessionProvider from next-auth/react

#### 1.8 Update all pages that call getUser()

**Modify pages** that import from `@/lib/auth`:
- `src/app/page.tsx` (dashboard) — get user name from session
- `src/app/settings/page.tsx` — get user from session, logout via signOut()
- Replace all `getUser()` calls with `useSession()` hook

#### 1.9 Delete old auth login route

**Delete `src/app/api/auth/login/route.ts`** — replaced by NextAuth [...nextauth] handler

### Acceptance Criteria
- [ ] Visiting any page while logged out redirects to /login
- [ ] PIN login works and creates a server session (visible in cookies)
- [ ] All API routes return 401 without valid session
- [ ] Admin routes return 403 for STAFF role
- [ ] Session contains user id, role, and locationId
- [ ] No more localStorage auth usage
- [ ] Toast webhook still works without session (uses signature verification)

---

## Phase 2: User Management CRUD

**Goal**: Full create/edit/delete for users with PIN management and role assignment.

**Prerequisites**: Phase 1 (auth must work so admin routes are protected)

### Tasks

#### 2.1 Expand user API

**Rewrite `src/app/api/admin/users/route.ts`**:
- GET: (exists) List users for session's locationId, exclude pin hash
- POST (NEW): Create user
  - Zod schema: name, email, pin (4-6 digits), role (ADMIN/MANAGER/STAFF)
  - Hash PIN with bcryptjs before storing
  - Validate email uniqueness
  - Assign to session's locationId
- PATCH (NEW): Update user
  - Zod schema: id required; name, email, role, pin all optional
  - If pin provided, hash it
  - If email changed, validate uniqueness
  - Cannot demote the last ADMIN
- DELETE (NEW): Deactivate user
  - Soft delete preferred (add isActive field) OR hard delete with confirmation
  - Cannot delete yourself
  - Cannot delete the last ADMIN
  - Delete requires ADMIN role specifically

#### 2.2 Schema update (if soft delete)

**Modify `prisma/schema.prisma`**:
- Add `isActive Boolean @default(true)` to User model
- Run `npm run db:generate` and `npm run db:push`

#### 2.3 Full user management UI

**Rewrite `src/app/settings/users/page.tsx`**:
- List all users with role badges (keep existing styling)
- "Add User" button → modal with form:
  - Name, email, PIN (masked input), role dropdown
  - Validation: email format, PIN 4-6 digits, name required
- Edit button on each user → same modal pre-filled
  - PIN field optional on edit (blank = keep current)
- Delete button with confirmation dialog
  - "Are you sure? This cannot be undone."
- Role-based visibility: only ADMIN/MANAGER can see this page
- Toast notifications for all operations

### Acceptance Criteria
- [ ] Can create new users with PIN
- [ ] Can edit user name, email, role
- [ ] Can reset a user's PIN
- [ ] Can delete users (with confirmation)
- [ ] Cannot delete yourself or last admin
- [ ] New users can log in with their PIN
- [ ] STAFF users cannot access user management

---

## Phase 3: Forecasting System

**Goal**: Implement sales velocity forecasting using moving averages and day-of-week seasonality. Use forecasts for smarter alert predictions.

**Prerequisites**: Phase 1 (need auth for API routes). Phase 2 is NOT required.

### Tasks

#### 3.1 Implement forecast calculation engine

**Create `src/lib/forecast.ts`** (NEW FILE):
```typescript
// Core forecasting functions:

calculateMovingAverage(itemId, windowDays = 14):
  - Query SaleEvents for this item's recipes over past N days
  - Group by day, calculate daily depletion (quantity × recipe.quantityUsed)
  - Return average daily depletion rate

calculateDayOfWeekRates(itemId, windowWeeks = 4):
  - Query SaleEvents over past N weeks
  - Group by dayOfWeek (0-6)
  - Calculate avg depletion rate per day-of-week
  - Returns array of 7 rates

calculateSeasonality(dayOfWeekRates, overallAvg):
  - For each day: seasonality = dayRate / overallAvg
  - Returns array of 7 multipliers (>1 = busier than average)

predictDepletion(itemId, currentStock):
  - Get current day of week
  - Get forecast for this item (from ForecastSnapshot or calculate live)
  - Use hourly rate (avgSalesRate × seasonality for today)
  - Return predicted DateTime when stock hits 0, or null if no sales data
  - This REPLACES the existing estimateDepletionTime() in inventory.ts

updateForecastSnapshots(locationId):
  - For each active InventoryItem in location:
    - Calculate day-of-week rates
    - Upsert ForecastSnapshot for each day (0-6)
  - This is the batch update function (called on schedule or manually)
```

#### 3.2 Wire forecast into alert creation

**Modify `src/lib/inventory.ts`**:
- Update `shouldCreateAlert()` to use forecast-based depletion prediction
- Remove the existing `estimateDepletionTime()` (replaced by forecast.ts version)
- Export a new `createAlertIfNeeded(itemId, locationId)` that:
  1. Calculates current stock
  2. Gets forecast-based depletion prediction
  3. Checks if alert already exists
  4. Creates alert with accurate predictedDepletionAt

**Modify `src/app/api/inventory/waste/route.ts`**:
- Replace inline alert creation (lines 83-97) with `createAlertIfNeeded()`
- Use real predicted depletion time instead of hardcoded 1 hour

**Modify `src/app/api/toast/webhook/route.ts`**:
- Replace inline alert creation (lines 108-133) with `createAlertIfNeeded()`

#### 3.3 Create forecast API endpoint

**Create `src/app/api/inventory/forecast/route.ts`** (NEW FILE):
- GET: Return forecast data for an item or all items
  - Query params: itemId (optional), locationId (from session)
  - Returns: ForecastSnapshot data + predicted depletion for each item
- POST: Trigger forecast recalculation
  - Calls `updateForecastSnapshots(locationId)`
  - Protected: MANAGER or ADMIN only

#### 3.4 Add forecast display to UI

**Modify `src/app/alerts/page.tsx`**:
- Show predicted depletion time using real forecast data (not hardcoded)
- Add "Recalculate Forecasts" button for managers

**Modify `src/app/page.tsx`** (dashboard):
- Show depletion ETA on attention-needed items
- Add a "Predicted Stockouts Today" section if any items are forecast to run out

**Modify `src/components/ItemCard.tsx`**:
- Add optional `depletionEta` prop
- Display "~Xh left" or "runs out by 2pm" when provided

#### 3.5 Deduplicate getStockStatus

**Modify `src/lib/utils.ts`**:
- Remove `getStockStatus()` from utils.ts (it's duplicated)
- Keep the canonical version in `src/lib/inventory.ts`
- Update any imports across the codebase

### Acceptance Criteria
- [ ] ForecastSnapshot records are populated from real sales data
- [ ] Forecast recalculation can be triggered manually
- [ ] Alerts show real predicted depletion times (not hardcoded 1 hour)
- [ ] Dashboard shows depletion ETAs for at-risk items
- [ ] Day-of-week seasonality is reflected in predictions (busy Friday ≠ slow Monday)
- [ ] Items with no sales history gracefully fall back to threshold-only alerts
- [ ] getStockStatus exists in only one place

---

## Phase 4: Toast POS Integration

**Goal**: Make the Toast SDK production-ready. Real OAuth, menu sync, webhook verification, and inventory write-back. Placeholder mode must still work for development.

**Prerequisites**: Phase 1 (auth). Phase 3 recommended (forecasting improves alert quality from webhooks).

### Tasks

#### 4.1 Harden Toast SDK

**Modify `src/lib/toast-sdk.ts`**:
- Keep the `isPlaceholder()` check pattern — all methods return mock data when TOAST_CLIENT_ID === "PLACEHOLDER_CLIENT_ID"
- Fix real OAuth flow:
  - Implement proper token refresh (current code has structure but never runs)
  - Store token with expiration, refresh before expiry
  - Handle 401 responses with automatic retry after refresh
- Implement real `verifyWebhookSignature()`:
  - HMAC-SHA256 verification using TOAST_WEBHOOK_SECRET
  - Compare computed signature with Toast-Signature header
  - Reject requests with invalid/expired signatures
  - Keep returning true in placeholder mode

#### 4.2 Menu sync

**Create `src/app/api/toast/sync/route.ts`** (NEW FILE):
- POST: Trigger menu sync from Toast
  - Calls toastSdk.fetchMenus()
  - Upserts MenuItems (match by toastMenuItemId)
  - Reports what was added/updated/unchanged
  - Protected: ADMIN or MANAGER only
  - In placeholder mode: syncs mock menu data (still useful for testing)

**Modify `src/app/settings/page.tsx`**:
- Add "Sync Menu from Toast" button in Toast Integration section
- Show last sync timestamp
- Show sync results (items added/updated)

#### 4.3 Inventory write-back

**Create `src/app/api/toast/writeback/route.ts`** (NEW FILE):
- POST: Push current inventory counts to Toast
  - Check Location.writeBackEnabled first
  - For each item with toastItemId: call toastSdk.updateInventoryCount()
  - Log results to AuditLog
  - Protected: ADMIN or MANAGER only

**Modify `src/app/settings/page.tsx`**:
- Add "Push to Toast" button (only visible when writeBackEnabled)
- Show confirmation dialog with item count

#### 4.4 Harden webhook endpoint

**Modify `src/app/api/toast/webhook/route.ts`**:
- Use real verifyWebhookSignature() (from 4.1)
- Add idempotency improvements:
  - Check for duplicate toastOrderId before processing
  - Handle partial order updates (ORDER_UPDATED after ORDER_CREATED)
- Add error handling:
  - Return 200 even on processing errors (Toast retries on non-200)
  - Log errors to AuditLog
- Add MENU_UPDATED handler:
  - Auto-sync menu items when Toast sends menu changes

### Acceptance Criteria
- [ ] Placeholder mode still works with mock data when no Toast credentials
- [ ] Real OAuth token flow works when credentials are provided
- [ ] Webhook signature verification rejects invalid signatures (when not placeholder)
- [ ] Menu sync creates/updates MenuItem records from Toast
- [ ] Inventory write-back pushes counts to Toast
- [ ] Webhook processes orders and creates SaleEvents + alerts
- [ ] All Toast operations logged to AuditLog

---

## Phase 5: Database & Deployment

**Goal**: Set up production database, migrations, and deploy to Vercel.

**Prerequisites**: Phase 1 (auth, since env vars include NEXTAUTH_SECRET). Phases 2-4 should be complete or near-complete.

### Tasks

#### 5.1 Set up Neon PostgreSQL

- Create Neon project (recommended: neon.tech — free tier, serverless, Vercel integration)
- Get connection string (pooled + direct)
- Update .env with production DATABASE_URL
- Update .env.example with Neon placeholder format

#### 5.2 Switch to migrations

- Run `npx prisma migrate dev --name init` to create initial migration from current schema
- Verify migration file in `prisma/migrations/`
- Update CLAUDE.md: prefer `db:migrate` over `db:push` going forward
- Seed production database: `npm run db:seed`

#### 5.3 Vercel deployment

- Connect GitHub repo to Vercel
- Configure environment variables in Vercel dashboard:
  - DATABASE_URL (Neon pooled connection string)
  - NEXTAUTH_SECRET (generate with openssl)
  - NEXTAUTH_URL (production domain)
  - Toast credentials (placeholder for now)
- Add build command: `npx prisma generate && next build`
- Verify Prisma client is generated during build (add postinstall script if needed)

**Modify `package.json`**:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

#### 5.4 Environment configuration

**Update `.env.example`**:
- Add comments explaining each variable
- Add Neon-specific format for DATABASE_URL
- Add NEXTAUTH_URL production placeholder

### Acceptance Criteria
- [ ] App deploys to Vercel without errors
- [ ] Database connection works from Vercel (pooled connection)
- [ ] Prisma migrations run cleanly
- [ ] Login works on deployed app
- [ ] All API routes work on deployed app
- [ ] Seed data loads correctly in production DB

---

## Phase 6: Testing

**Goal**: Set up Vitest and write tests for critical paths.

**Prerequisites**: Phase 1 (auth changes must be stable before writing tests). Ideally after Phases 2-4.

### Tasks

#### 6.1 Set up Vitest

**Install dependencies**:
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Create `vitest.config.ts`** (NEW FILE):
- Configure jsdom environment for component tests
- Set up path aliases (@/ → src/)
- Configure coverage reporter

**Modify `package.json`**:
- Add `"test": "vitest"` script
- Add `"test:coverage": "vitest run --coverage"` script

#### 6.2 Unit tests — stock calculation

**Create `src/lib/__tests__/inventory.test.ts`** (NEW FILE):
- Test computeStockFromData with various scenarios:
  - All zeros → returns parLevel
  - Prep adds stock, waste removes stock
  - Sales depletion through recipes
  - Negative stock (out of stock)
- Test getStockStatus thresholds:
  - out: ≤ 0
  - critical: ≤ safetyStock
  - low: ≤ parLevel × 0.5
  - ok: above low threshold

#### 6.3 Unit tests — forecasting

**Create `src/lib/__tests__/forecast.test.ts`** (NEW FILE):
- Test calculateMovingAverage with mock data
- Test calculateDayOfWeekRates
- Test calculateSeasonality multipliers
- Test predictDepletion edge cases (no sales data, zero stock)

#### 6.4 API integration tests

**Create `src/app/api/__tests__/inventory.test.ts`** (NEW FILE):
- Test GET /api/inventory returns items with computed stock
- Test POST /api/inventory/prep creates adjustment
- Test POST /api/inventory/waste creates adjustment + alert when critical
- Test auth: 401 without session, 403 for wrong role

#### 6.5 Update CLAUDE.md

**Modify `CLAUDE.md`**:
- Add test commands section
- Document testing conventions

### Acceptance Criteria
- [ ] `npm test` runs and passes
- [ ] Stock calculation has >90% coverage
- [ ] Forecasting logic has >80% coverage
- [ ] At least one API integration test per critical route
- [ ] Auth enforcement tested (401/403 scenarios)

---

## Phase 7: Production Hardening & Polish

**Goal**: Error handling, accessibility, performance, and UX polish.

**Prerequisites**: Phases 1-5 complete.

### Tasks

#### 7.1 Error boundaries

**Create `src/components/ErrorBoundary.tsx`** (NEW FILE):
- React error boundary with fallback UI
- "Something went wrong" with retry button
- Log errors (console in dev, could be Sentry later)

**Modify `src/app/layout.tsx`**:
- Wrap app content with ErrorBoundary

#### 7.2 Loading and empty states

**Audit all pages** for consistent loading/empty state patterns:
- Loading: skeleton cards (some pages have this, standardize)
- Empty: icon + message + action button
- Error: retry button + error message

#### 7.3 Accessibility

- Add `aria-labels` to all form inputs
- Add `aria-current="page"` to active BottomNav item
- Add keyboard navigation to QuantityModal
- Add focus trapping in modals
- Ensure color contrast meets WCAG AA

#### 7.4 Performance

- Add `loading="lazy"` to non-critical page sections
- Add debounce to search inputs (some have it, standardize)
- Consider SWR or React Query for data fetching (evaluate if worth the complexity)

#### 7.5 Remove code duplication

- Ensure getStockStatus exists in only one place (done in Phase 3.5 if not already)
- Audit for any other duplicated logic

#### 7.6 Update REMAINING_WORK.md

- Check off completed items
- Remove or update outdated items
- Add any new items discovered during implementation

### Acceptance Criteria
- [ ] No unhandled errors crash the app
- [ ] All pages have loading, empty, and error states
- [ ] Keyboard navigation works for critical flows
- [ ] Search inputs are debounced
- [ ] REMAINING_WORK.md reflects actual state

---

## Phase 8: Multi-Location Groundwork

**Goal**: Prepare the architecture for multi-location support WITHOUT fully implementing it. This is schema and code-level preparation only.

**Prerequisites**: All previous phases.

### Tasks

#### 8.1 Audit location scoping

- Verify all queries filter by locationId from session (done in Phase 1)
- Document any remaining hardcoded "loc-1" references
- Ensure seed.ts can create multiple locations

#### 8.2 Location selector

**Create `src/app/select-location/page.tsx`** (NEW FILE, skeleton only):
- UI for users who belong to multiple locations
- List locations, tap to select
- Store selected locationId in session

#### 8.3 Schema consideration

**Evaluate** whether User should support multiple locations:
- Current: User has one locationId (foreign key)
- Future: May need UserLocation join table for multi-location staff
- Decision: Document the migration path but don't implement yet

### Acceptance Criteria
- [ ] No hardcoded location IDs remain in codebase
- [ ] All queries use session-derived locationId
- [ ] Migration path from single to multi-location is documented
- [ ] Location selector page skeleton exists

---

## Out of Scope (Future Work, not in this plan)

These items from REMAINING_WORK.md are intentionally deferred:
- **Reconciliation page** (variance review + write-back UI) — useful but not MVP-critical
- **Audit log viewer page** — data is logged, viewer is a nice-to-have
- **Location CRUD** (`/api/admin/locations`) — not needed until multi-location (Phase 8+)
- **Export reports** (CSV, PDF) — Phase 2+ feature
- **Push notifications** — Phase 2+ feature
- **Batch reconciliation mode** — Phase 2+ feature
- **Dark mode** — Phase 2+ feature
- **Offline detection and queueing** — Phase 2+ feature
- **E2E tests** (Playwright) — important but unit/integration tests come first

## Items REMAINING_WORK.md Lists as Missing but Already Exist
- Login page at /login — EXISTS, fully implemented
- Item management CRUD (settings/items) — EXISTS, fully implemented
- Recipe management (settings/recipes) — EXISTS, fully implemented

---

## Quick Reference: File Map

### Files to CREATE (new):
- `src/lib/auth.config.ts` — NextAuth configuration
- `src/auth.ts` — NextAuth exports
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `src/middleware.ts` — Route protection middleware
- `src/lib/api-auth.ts` — API route auth utilities
- `src/lib/forecast.ts` — Forecasting engine
- `src/app/api/inventory/forecast/route.ts` — Forecast API
- `src/app/api/toast/sync/route.ts` — Menu sync API
- `src/app/api/toast/writeback/route.ts` — Inventory write-back API
- `src/components/ErrorBoundary.tsx` — Error boundary
- `vitest.config.ts` — Test configuration
- `src/lib/__tests__/inventory.test.ts` — Stock calculation tests
- `src/lib/__tests__/forecast.test.ts` — Forecast tests
- `src/app/api/__tests__/inventory.test.ts` — API tests

### Files to MODIFY (existing):
- `src/lib/auth.ts` — Replace localStorage with session helpers
- `src/components/AuthGuard.tsx` — Use useSession() instead of localStorage
- `src/app/layout.tsx` — Add SessionProvider, ErrorBoundary
- `src/app/login/page.tsx` — Use NextAuth signIn()
- `src/app/page.tsx` — Session-based user, forecast data
- `src/app/settings/page.tsx` — Session-based user, Toast sync/writeback buttons
- `src/app/settings/users/page.tsx` — Full CRUD UI
- `src/app/alerts/page.tsx` — Real forecast depletion times
- `src/components/ItemCard.tsx` — Optional depletion ETA
- `src/lib/inventory.ts` — Wire forecast into alerts, deduplicate
- `src/lib/toast-sdk.ts` — Real OAuth, webhook verification
- `src/lib/utils.ts` — Remove duplicated getStockStatus
- `src/app/api/admin/users/route.ts` — Full CRUD
- `src/app/api/inventory/waste/route.ts` — Use createAlertIfNeeded()
- `src/app/api/toast/webhook/route.ts` — Real verification, better error handling
- All API route files — Add auth checks, session-based locationId
- `package.json` — Add test scripts, postinstall
- `prisma/schema.prisma` — Add User.isActive field
- `CLAUDE.md` — Update with test commands, new architecture notes
- `REMAINING_WORK.md` — Update completion status
