# Working Plan — Kitchen‑Up Inventory (KUI)

## Note on Sub‑Agents
I ran three independent sub‑agent reviews. This environment does not allow selecting specific external models, so I could not force gpt‑5, gemini‑pro‑3, claude‑haiku, and claude‑sonnet. The plan below is a consensus synthesis of the three independent outputs.

## 1) Goals
- Build a real‑time, phone‑first inventory workflow for prep staff to log Live Prep and Live Waste.
- Reduce drift between theoretical (POS) inventory and operational (kitchen) counts.
- Provide predictive alerts before items run out based on live sales vs. live prep.
- Deliver an MVP in 1–3 months with an AI‑agentic development process.

## 2) Scope (MVP)
- Single‑location deployment using Toast Custom Integration (Client ID/Secret).
- Real‑time decrement from Toast webhooks (order_updated, menu_updated).
- Manual Live Prep/Waste logging by kitchen staff.
- Predictive alerts using moving averages and day‑of‑week seasonality.
- Optional write‑back to Toast inventory endpoint, disabled by default.

## 3) Non‑Goals (MVP)
- Multi‑location enterprise features.
- Full accounting/COGS reporting.
- Advanced forecasting beyond simple heuristics.
- Replacing Toast menu management.

## 4) Users & Roles
- Line Cook / Prep Staff: log Live Prep/Waste, view item status.
- Chef / Kitchen Manager: configure par levels, review alerts, reconcile counts.
- Owner / Admin: manage Toast credentials, enable write‑back, manage users.

## 5) Core Features
- Live Prep logging (fast tap‑to‑prep UI).
- Live Waste logging with reason codes.
- Real‑time inventory status (in‑stock / low / critical).
- Predictive alerts (time‑to‑out).
- Audit log of adjustments.
- Optional write‑back to Toast counts.

## 6) Data Model (Draft)
- User (id, role, name, authProviderId)
- Location (id, toastLocationId, settings)
- InventoryItem (id, name, unit, parLevel, safetyStock, linkedToastItemId)
- MenuItem (id, toastMenuItemId, name)
- Recipe (id, menuItemId, yields, ingredientLinks)
- LiveAdjustment (id, itemId, type prep|waste|manual, deltaQty, unit, userId, timestamp)
- SaleEvent (id, toastOrderId, itemId, qty, timestamp)
- ForecastSnapshot (itemId, dayOfWeek, avgSalesRate, updatedAt)
- Alert (id, itemId, status, predictedDepletionAt, createdAt)

## 7) Integrations
- Toast REST API (v1/v2): menu, inventory, sales data.
- Toast Webhooks: order_updated, menu_updated.
- Optional push notifications.

## 8) UX / Workflow (MVP)
1. Login → Location select.
2. Home: Quick actions (Live Prep, Live Waste, Alerts).
3. Live Prep: tap item → qty → submit (≤ 10s flow).
4. Live Waste: tap item → qty + reason → submit.
5. Alerts: list of items projected to stockout soon; resolve/assign.
6. Reconciliation: variance review; optional write‑back to Toast.

## 9) Architecture & Scaffolding (Agentic‑AI Friendly)
### Recommended Structure (Monorepo)
- apps/
  - mobile/ (phone‑first UI)
  - api/ (webhook receiver + inventory engine)
  - worker/ (forecasting + scheduled jobs)
- packages/
  - types/ (shared types/contracts)
  - toast‑sdk/ (Toast client wrapper)
  - forecasting/ (moving average logic)
- infra/
  - db/ (migrations, seeds)
  - docker/ (runtime containers)
- docs/
  - api/ (OpenAPI)
  - architecture/ (ADRs)

### Services
- Inventory service: live counts, adjustments, audit.
- Menu/recipes service: map Toast menu items → inventory items.
- Forecast service: moving averages + seasonality.
- Alerts service: thresholds + notification triggers.
- Integration service: webhook ingestion + write‑back.

## 10) Milestones (6–10 weeks)
1. Week 1–2: schema + Toast auth + menu sync.
2. Week 3–4: live prep/waste + inventory engine.
3. Week 5–6: alerts + forecasting logic.
4. Week 7–8: reconciliation + optional write‑back.
5. Week 9–10: pilot rollout + feedback.

## 11) Risks & Mitigations
- Toast API limits → caching + webhook‑first updates.
- Unit conversion errors → standard unit registry + validation.
- Adoption friction → 1‑tap quick actions + minimal data entry.
- Webhook failures → idempotent processing + retry.

## 12) AI‑Agentic Development Plan
- Architect Agent: schema + service boundaries.
- Integration Agent: Toast SDK + webhook validation.
- UI Agent: Live Prep/Waste UX.
- QA Agent: contract tests + webhook replay tests.
- Docs Agent: OpenAPI + onboarding.

## 13) Immediate Next Steps
1. Confirm scope decisions (single location, write‑back default off).
2. Create database schema draft.
3. Scaffold Toast SDK wrapper and webhook receiver.
4. Implement Live Prep/Waste UI prototype.
