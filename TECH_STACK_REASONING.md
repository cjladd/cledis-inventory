# Tech Stack Reasoning — Kitchen-Up Inventory (KUI)

## Requirements Analysis
- Phone-first web app for kitchen staff
- Real-time updates (Toast webhooks, live prep/waste)
- Role-based auth (line cook, manager, admin)
- Relational data (inventory, recipes, users, audit logs)
- Single-location MVP, expandable later
- AI-agentic development friendly (type safety, clear contracts)

## Stack Decision

### Frontend: **Next.js 14 (App Router) + TypeScript + Tailwind CSS**
**Why:**
- Server-side rendering + API routes in one project = faster MVP
- App Router supports server actions for real-time updates
- TypeScript catches errors early, essential for agentic dev
- Tailwind makes responsive mobile-first UI fast
- PWA-capable for "app-like" feel on phones
- Single codebase for admin dashboard + staff UI

**Rejected alternatives:**
- React Native/Expo: requires app store deployment, slower iteration
- Separate frontend/backend: more complexity for MVP

### Backend: **Next.js API Routes + Prisma ORM**
**Why:**
- Prisma: type-safe database access, auto-generated types, migrations
- API routes handle webhooks, auth, CRUD
- No separate server to deploy

### Database: **PostgreSQL (via Supabase or local)**
**Why:**
- Relational model fits inventory/recipes/audit data
- Supabase provides hosting + realtime subscriptions (optional)
- Industry standard, scales well

**Rejected alternatives:**
- SQLite: limited concurrent writes, no realtime
- MongoDB: relational data better in SQL

### Auth: **NextAuth.js (Auth.js)**
**Why:**
- Built for Next.js
- Supports credentials (PIN for staff) + OAuth (admin)
- Role-based access built-in

### Realtime (optional, Phase 2): **Supabase Realtime or Pusher**
- Not critical for MVP; polling acceptable initially

### Toast Integration: **Custom SDK wrapper with placeholders**
- Fetch menu, receive webhooks, write-back
- Placeholder env vars until API access granted

---

## Final Stack Summary
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js |
| Deployment | Vercel (or Docker) |
| Toast | Custom SDK (placeholders) |

## Why This Stack for Agentic Development
- **Type safety everywhere**: TypeScript + Prisma = clear contracts
- **Single repo**: easier for agents to navigate
- **Convention over config**: Next.js patterns are predictable
- **Fast iteration**: hot reload, quick deploys
- **Clear file structure**: pages, components, lib, api
