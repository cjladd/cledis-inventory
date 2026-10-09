# Decisions

Why the system is shaped the way it is, and what is deliberately not built yet.

---

## The app models a workflow, not a live stock number

**Status:** agreed, not yet implemented.

KUI was originally built around a continuously-accurate stock figure, decremented
in real time by Toast sales. That does not match how Cledis actually runs:

- **Ordering** happens 1–2 times a week. Someone physically walks the store,
  counts every box, and estimates what to order.
- **Prep** happens every morning. Someone counts *the cooler* (not the line) and
  writes a list of what needs to be made to bring each item back up to par.

Both moments of truth are a human counting. A derived number that drifts between
those counts does not help — it competes with the count, and the count wins.

So the value of the app is not in knowing current stock. It is in:

1. **Suggesting an order** from sales history, so the weekly count becomes a
   verification rather than a guess.
2. **Flagging what to check** before the morning prep count.
3. **Bilingual prep recipes** on a phone (see below).

### What is built today, and what replaces it

Stock is currently `parLevel + prep − waste + manual − sales`, counted from the
start of the current service day (`Location.timezone`, `Location.dayStartHour`,
default 4am). Before this it was counted from the beginning of time, so the
number drifted permanently and every request loaded the entire ledger.

The service-day boundary is **interim**. It lives behind one function,
`stockWindowStart` in `src/lib/service-day.ts`, reached through
`locationStockWindowStart` in `src/lib/inventory.ts`. When physical counts are
modelled, that function returns the timestamp of the last count instead, and
every caller keeps working unchanged.

The planned model:

```
InventoryCount {
  inventoryItemId, quantity, storageArea (cooler | line | dry | walkin),
  countedAt, userId, countType (order | prep)
}
```

Stock then reads as *"18 lb counted Tue 6:05am, ~11 lb projected now"* — the
counted figure as fact, the projection clearly labelled an estimate.

### Known modelling gaps this exposes

- **`parLevel` is a target, not a starting balance.** In the kitchen, par is the
  level the cooler is topped up *to*, so prep needed = par − what is in the
  cooler. The current arithmetic treats par as an opening balance.
- **Cooler vs line is not modelled.** Par keys off the cooler only.
- **Prep sub-recipes are not modelled.** Logging a `batch` of Cledis sauce adds
  the batch but decrements none of the raw ingredients it consumed.

---

## Prep recipes are net-new

**Status:** agreed, not yet implemented.

`Recipe` in the schema is a depletion mapping — *a burger consumes 0.25 lb of
beef*. It is not a recipe anyone can cook from. There are no ingredient lists or
steps anywhere in the data model, in any language.

Planned, separate from `Recipe`:

```
PrepRecipe {
  inventoryItemId, yieldQty, yieldUnit
  name_en / name_es
  steps: [{ order, text_en, text_es }]
  ingredients: [{ inventoryItemId, qty, unit }]
}
```

---

## Spanish is a requirement, not a nice-to-have

**Status:** agreed, scaffolding only.

Cross-language support is necessary for this kitchen, and it covers the whole
app: navigation and buttons as well as item names and recipe steps. A cook picks
a language once and should never see English again.

`User.language` (`EN` | `ES`) exists in the schema as groundwork. Nothing reads
it yet — there is no i18n layer, and adding one is its own piece of work.

---

## Toast integration

**Status:** blocked on credentials.

Phase 4 cannot proceed without real Toast API access. Once the stock model is
count-anchored, Toast sales data becomes a *forecasting input* (how much did we
sell, therefore how much should we order) rather than a live decrementer, which
makes a daily batch pull viable and lowers the stakes on webhook reliability.

Two things to know before wiring it up:

- **The SDK is single-location but the database is multi-location.**
  `src/lib/toast-sdk.ts` reads credentials from environment variables, while
  `Location` carries per-location `toastClientId` / `toastClientSecret` that the
  SDK never reads. One of the two has to give.
- **`toastClientSecret` is stored in plaintext** in the database. Before real
  credentials go in, it needs application-level encryption or to live only in
  environment configuration.

---

## Deliveries are captured from a photo

**Status:** agreed, not yet implemented.

Receiving is the other moment the kitchen already does by hand: a truck arrives
1-2 times a week and someone reconciles paper against boxes. Photographing that
paper and letting Claude read it turns a retype into a confirm.

### Two sources, not one

| Source | What it is | Trust |
|---|---|---|
| `INVOICE` | What actually arrived | Authoritative - can anchor stock |
| `ORDER` | What was asked for | Provisional - deliveries get shorted and substituted |

Both are supported because invoices go missing, get soaked, or never make it off
the truck. But they are **not** interchangeable, and the distinction has to
survive into the data: an order-sourced delivery is recorded as provisional and
shown as such, because silently treating a request as a receipt reintroduces
exactly the drift the count-anchored model exists to remove.

Two things make the fallback worth having beyond resilience:

- A screenshot of the vendor's web order is clean digital text in a consistent
  layout. It parses *more* reliably than a phone photo of crumpled thermal paper
  under kitchen lights.
- Order screens usually show **vendor SKU numbers**. A SKU is a stable key;
  description text drifts between orders. SKUs captured here feed the alias
  table below and improve invoice matching too.

### The hard part is matching, not reading

Claude reads an invoice well. What it cannot do unaided is know that
`BEEF GRND BULK 80/20 FRSH 10# AVG` is this kitchen's `Ground Beef 80/20`.
Each distributor abbreviates differently and descriptions change between orders.

So the first human confirmation of a line is stored as a **vendor alias**
(vendor + SKU or raw description -> inventory item + conversion factor). After a
few deliveries most lines match on their own and the person is only checking
quantities. The confirm step earns its keep by training the table.

### This forces the units problem

Today the catalogue is 129 items in `case`, 33 in `batch`, 26 in `lb`, plus
`qt`, `pan`, `pack`, `container`, `cup` and `bag` - nine free-text strings with
no conversions. An invoice reads "2 CS" of ground beef against an item tracked in
`lb`. **Without a per-item case size, a delivery cannot become a stock number.**

The units gap is listed under Deliberate non-fixes below. This feature is what
makes it blocking rather than latent, and the ordering forecast needs it anyway.

### Shape

- New `AdjustmentType` value `RECEIVED` - a delivery is not prep, waste or a
  manual correction.
- `Delivery` (photo, vendor, source, date, status, uploaded by),
  `DeliveryLine` (raw text, parsed quantity and unit, matched item, confirmed),
  `VendorAlias` (vendor + key -> item + conversion).
- Needs blob storage, which the app has none of today.
- Extraction via Claude vision with a structured-output schema. Cost is well
  under a cent per document, so it is not a factor.

**Never auto-commit.** The flow is photo -> parsed draft -> human confirms ->
write. A misread 12 for 2 would otherwise corrupt stock with nothing to show
what happened.

### Why it fits

The count-anchored model wants events where stock is *known* rather than
inferred, and a delivery is a documented restock with paper behind it. It also
produces real purchase history, so the ordering forecast can reason from what
was actually bought and when - not from sales alone.

---

## Deliberate non-fixes

- **Waste exceeding computed stock is allowed.** The stock figure is an estimate
  until counts land, and refusing the entry would push staff to stop logging
  waste — losing the data forecasting depends on.
- **Login lockout returns the same generic error** as a wrong PIN. NextAuth's
  credentials provider cannot easily return a distinct reason, and saying
  "account locked" confirms the address exists.
- **Units are free-text strings.** `lb`, `case` and `batch` are conventions, not
  an enum, and there is no conversion between them. A recipe in `oz` against an
  item in `lb` would silently compute wrong. Worth an enum + conversion table
  before the ordering forecast depends on it.
