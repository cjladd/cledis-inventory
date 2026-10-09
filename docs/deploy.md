# Deploying

First deploy takes about 20 minutes, most of it waiting. The app is a standard
Next.js app with Postgres behind it, so nothing here is exotic.

## 1. Database

Provision a Postgres database and get its connection string. Vercel's own
Storage tab offers Postgres (Neon-backed) and wires `DATABASE_URL` into the
project automatically, which is the shortest path. Neon or Supabase directly
work just as well — you paste the connection string yourself.

Prisma needs a **pooled** connection string for serverless. Providers label this
differently (`-pooler` in the host, "connection pooling", "transaction mode").
Use the pooled one for `DATABASE_URL`.

## 2. Vercel project

Import the GitHub repo. Framework preset is detected; the build command is
already correct in `package.json` (`prisma generate && next build`).

## 3. Environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` — generate a fresh one |
| `NEXTAUTH_URL` | The deployed URL, e.g. `https://kui.vercel.app` |
| `AUTH_TRUST_HOST` | `true` |
| `TOAST_WEBHOOK_SECRET` | Random string until real Toast credentials exist |
| `NEXT_PUBLIC_SHOW_DEMO_LOGINS` | `true` **only** for a demo deployment |

`AUTH_TRUST_HOST` is not optional. Auth.js validates the request host in
production, and a mismatch returns a 500 on every auth call — the login screen
renders fine and then nothing works, which is a confusing failure to debug.

`NEXT_PUBLIC_SHOW_DEMO_LOGINS=true` puts seeded accounts **and their PINs** on
the login screen. Anyone with the link can sign in. That is the point for a
demo; it must be unset before real staff use the app.

## 4. Schema and seed

Run once from your machine, pointed at the deployed database:

```bash
DATABASE_URL="<production connection string>" npm run db:deploy
DATABASE_URL="<production connection string>" npm run db:seed
```

`db:deploy` applies migrations (it does not generate new ones). `db:seed` is
idempotent for the catalogue — locations, users, items, menu items and recipes
are upserted — but it **resets demo activity**: prep/waste adjustments, sales,
alerts and audit logs for Elm Hill are deleted and rewritten. Do not re-run it
against a database holding real kitchen data.

## 5. Check it

- `/login` loads and a seeded account signs in
- `/api/auth/session` returns JSON, not an HTML error page
- Prep and waste write, and the list updates
- `/api/toast/webhook` returns 200 on GET

## Seeded accounts

Per location (`elmhill`, `bellevue`, `gulch`):

| Role | Email | PIN |
|---|---|---|
| Admin | `admin.<slug>@cledis.com` | 9999 |
| Manager | `manager.<slug>@cledis.com` | 1234 |
| Line cook | `staff.<slug>@cledis.com` | 0000 |

These are demo credentials with published PINs. Before real use: unset
`NEXT_PUBLIC_SHOW_DEMO_LOGINS`, change the PINs, and delete the accounts for
locations that are not in use.

## Known gaps at first deploy

- **Sales data is seeded, not real.** Forecasts and run-out predictions are
  therefore thin. Toast credentials are what make them meaningful.
- **`toastClientSecret` is stored in plaintext.** Fine while it holds a
  placeholder; needs encryption before real credentials go in. See
  `docs/decisions.md`.
