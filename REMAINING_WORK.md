# Remaining Work — Kitchen-Up Inventory

This document tracks gaps identified during sub-agent review.

## Critical (Before Production)

### 1. Authentication
- [ ] Implement NextAuth.js setup
- [ ] Add PIN-based credentials provider for staff
- [ ] Add auth middleware to all API routes
- [ ] Add session checks to UI pages
- [ ] Create login page at /login

### 2. Role-Based Access
- [ ] Enforce STAFF/MANAGER/ADMIN roles in API routes
- [ ] Hide admin features from STAFF role in UI
- [ ] Add role check utilities

## High Priority

### 3. Missing Pages
- [ ] Login/Location select page
- [ ] Reconciliation page (variance review, write-back)
- [ ] Audit log viewer
- [ ] Item management CRUD (settings/items)
- [ ] User management (settings/users)
- [ ] Recipe management (settings/recipes)

### 4. Missing API Routes
- [ ] POST /api/admin/locations - Location CRUD
- [ ] POST /api/admin/users - User CRUD
- [ ] POST /api/admin/items - Item CRUD
- [ ] POST /api/admin/recipes - Recipe CRUD
- [ ] POST /api/toast/sync - Manual menu sync
- [ ] POST /api/toast/writeback - Push counts to Toast
- [ ] GET /api/forecast/:itemId - Get forecast data

### 5. Forecasting System
- [ ] Create worker job to update ForecastSnapshot
- [ ] Calculate moving averages from sales data
- [ ] Integrate forecasting into alert creation
- [ ] Add forecast display to UI

## Medium Priority

### 6. Accessibility
- [ ] Add aria-labels to all form inputs
- [ ] Add aria-current to active nav items
- [ ] Add aria-pressed to toggle buttons
- [ ] Add proper modal focus management
- [ ] Add keyboard navigation support

### 7. Error Handling
- [ ] Add user-facing error messages
- [ ] Add retry logic for failed API calls
- [ ] Add offline detection and queueing
- [ ] Improve validation error display

### 8. Performance
- [ ] Add React Query or SWR for data fetching
- [ ] Add optimistic updates for prep/waste logging
- [ ] Implement pagination for large item lists
- [ ] Add debouncing to search inputs

## Low Priority (Phase 2)

### 9. Advanced Features
- [ ] Push notifications for alerts
- [ ] Multi-location support
- [ ] Batch reconciliation mode
- [ ] Export reports (CSV, PDF)
- [ ] Dark mode support

### 10. Testing
- [ ] Unit tests for inventory calculations
- [ ] API integration tests
- [ ] E2E tests for critical flows
- [ ] Webhook replay tests

---

## Quick Wins Completed
- [x] Prisma schema with all core models
- [x] Toast SDK placeholder with mock data
- [x] Core API routes (inventory, prep, waste, alerts)
- [x] Mobile-first UI pages
- [x] Component library (ItemCard, QuantityModal, etc.)
- [x] ForecastSnapshot model added
- [x] Stock calculation utilities

## Next Steps
1. Set up NextAuth.js for authentication
2. Add auth checks to existing API routes
3. Create login page
4. Add admin CRUD pages
