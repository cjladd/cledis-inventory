# Kitchen-Up Inventory (KUI)

Real-time operational inventory management for restaurants, designed to bridge the gap between POS theoretical inventory and actual kitchen operations.

## Features

- 📱 **Phone-first UI** - Quick tap-to-prep and tap-to-waste logging
- 🔄 **Real-time sync** - Toast POS webhook integration
- ⚠️ **Predictive alerts** - Know before you run out
- 👥 **Role-based access** - Staff, Manager, Admin roles
- 📊 **Audit trail** - Track all inventory changes

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Toast POS account (optional, for POS integration)

### Installation

```bash
# Clone and install
cd cledis-inventory
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and Toast credentials

# Set up database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

### Default Login

Seeded per location (`elmhill`, `bellevue`, `gulch`):

- **Manager**: manager.elmhill@cledis.com / PIN: 1234
- **Line Cook**: staff.elmhill@cledis.com / PIN: 0000

These shortcuts only appear on the login screen when
`NEXT_PUBLIC_SHOW_DEMO_LOGINS=true`. Without it the form asks for an email,
which is what any real deployment should do.

## Project Structure

```
cledis-inventory/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Sample data
├── src/
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── prep/        # Prep logging page
│   │   ├── waste/       # Waste logging page
│   │   ├── alerts/      # Alerts page
│   │   └── settings/    # Settings page
│   ├── components/      # UI components
│   └── lib/
│       ├── prisma.ts    # Database client
│       ├── toast-sdk.ts # Toast API wrapper
│       └── utils.ts     # Utilities
└── docs/                # Documentation
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Auth encryption key |
| `TOAST_CLIENT_ID` | Toast API client ID |
| `TOAST_CLIENT_SECRET` | Toast API client secret |
| `TOAST_LOCATION_ID` | Your Toast location ID |
| `TOAST_WEBHOOK_SECRET` | Webhook signing secret (required in production) |
| `NEXT_PUBLIC_SHOW_DEMO_LOGINS` | Show seeded demo accounts on the login screen |

### Toast Integration

1. Get API credentials from Toast developer portal
2. Add credentials to `.env`
3. Register webhook URL: `https://your-domain.com/api/toast/webhook`
4. Enable webhooks for `order_updated` events

## Customization

### Adding Inventory Items

Edit `prisma/seed.ts` to add your restaurant's inventory items:

```typescript
const inventoryItems = [
  { name: "Your Item", unit: "oz", parLevel: 10, safetyStock: 2, category: "Category" },
  // ... more items
];
```

### Setting Up Recipes

Link menu items to inventory in the seed file or via the admin UI:

```typescript
// Each chicken taco uses 4oz of chicken
await prisma.recipe.create({
  data: {
    menuItemId: "...",
    inventoryItemId: "...",
    quantityUsed: 0.25,
    unit: "lb",
  },
});
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/inventory` | GET | List inventory items with current stock |
| `/api/inventory/prep` | POST | Log prep (add stock) |
| `/api/inventory/waste` | POST | Log waste (remove stock) |
| `/api/inventory/alerts` | GET | Get active alerts |
| `/api/inventory/forecast` | GET | Projected run-out times per item |
| `/api/inventory/stats` | GET | Dashboard counts (low stock, alerts, preps today) |
| `/api/admin/items` | GET/POST/PATCH/DELETE | Manage inventory items (DELETE retires, keeping history) |
| `/api/admin/recipes` | GET/POST/PATCH/DELETE | Manage menu-item → inventory recipe links |
| `/api/admin/users` | GET/POST/PATCH/DELETE | Manage staff accounts |
| `/api/settings` | GET/PATCH | Location settings |
| `/api/toast/webhook` | POST | Receive Toast webhooks (bypasses session auth, verified by HMAC) |

## Development

```bash
# Run development server
npm run dev

# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Create and apply a migration (development)
npm run db:migrate

# Apply existing migrations (production)
npm run db:deploy

# Open Prisma Studio
npm run db:studio

# Lint, typecheck, test
npm run lint
npm run typecheck
npm test
```

### Database migrations

Schema changes go through `prisma/migrations`, not `db:push`. If you are
pointing at a database that already has the schema but no migration history,
baseline it once with `npm run db:baseline` before running `db:deploy`.

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Provision a Postgres database and set `DATABASE_URL`
4. Set `NEXTAUTH_URL` and `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
5. Set `TOAST_WEBHOOK_SECRET` — the webhook rejects every request in production without it
6. Deploy, then run `npm run db:deploy` and `npm run db:seed` against the deployed database

Do not set `NEXT_PUBLIC_SHOW_DEMO_LOGINS` in a real deployment.

There is no Dockerfile in this repo yet.

## Design decisions

`docs/decisions.md` records why the system is shaped the way it is, what is
deliberately not built yet, and the known gaps between the current data model
and how the kitchen actually works. Read it before changing the stock
calculation or the Toast integration.

## License

MIT

## Support

For questions or issues, contact the development team.
