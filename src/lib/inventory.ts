/**
 * Inventory calculation utilities
 *
 * Stock is anchored to the last physical count of an item: someone looked in
 * the cooler and wrote down what was there. From that moment the figure counts
 * forward through prep, waste and sales, and the result is an estimate whose
 * age the UI is expected to show.
 *
 * An item nobody has counted yet falls back to par level from the start of the
 * service day (see lib/service-day.ts), which is where every item sat before
 * counts existed.
 */

import prisma from "./prisma";
import { stockWindowStart } from "./service-day";
import type { StorageArea } from "@prisma/client";

export type StockStatus = "ok" | "low" | "critical" | "out";

/** Below this fraction of par, an item reads as "low". */
const LOW_STOCK_FRACTION = 0.5;

/**
 * Where an item's stock figure counts forward from.
 *
 * `source: "count"` means a human observed this quantity at `countedAt`.
 * `source: "par"` means nobody has counted it and we are assuming par.
 */
export interface StockBasis {
  baseline: number;
  since: Date;
  source: "count" | "par";
  countedAt: Date | null;
  countedQuantity: number | null;
  storageArea: StorageArea | null;
}

export interface StockCalculation {
  currentStock: number;
  status: StockStatus;
  prepTotal: number;
  wasteTotal: number;
  manualTotal: number;
  salesDepletion: number;
  /** Provenance, so the UI can separate what was counted from what is projected. */
  basis: "count" | "par";
  countedAt: Date | null;
  countedQuantity: number | null;
  storageArea: StorageArea | null;
}

// --- Types for the batch helper ---------------------------------------------
// These carry createdAt because each item now has its own cutoff, so the
// filtering happens here rather than in every caller's where clause.

export interface AdjustmentRow {
  type: "PREP" | "WASTE" | "MANUAL";
  quantity: number;
  createdAt: Date;
}

export interface RecipeWithSales {
  quantityUsed: number;
  menuItem: {
    saleEvents: { quantity: number; createdAt: Date }[];
  };
}

/**
 * Start of the current service day for a location.
 *
 * Still the fallback anchor for uncounted items, and still the window for
 * genuinely day-scoped figures like "preps logged today".
 */
export async function locationStockWindowStart(locationId: string): Promise<Date> {
  const location = await prisma.location.findUnique({
    where:  { id: locationId },
    select: { timezone: true, dayStartHour: true },
  });

  return stockWindowStart({
    timezone:     location?.timezone ?? "America/Chicago",
    dayStartHour: location?.dayStartHour ?? 4,
  });
}

/**
 * Resolve what each item's stock counts forward from, in one query.
 *
 * Items are keyed by id; any item without a count gets the par-level fallback,
 * so callers can assume every requested id is present in the map.
 */
export async function resolveStockBases(
  items: { id: string; parLevel: number }[],
  locationId: string
): Promise<Map<string, StockBasis>> {
  const dayStart = await locationStockWindowStart(locationId);

  // distinct + orderBy desc gives the most recent count per item. If this ever
  // gets slow, the fix is a raw DISTINCT ON rather than a wider fetch.
  const latestCounts = items.length
    ? await prisma.inventoryCount.findMany({
        where:    { inventoryItemId: { in: items.map((i) => i.id) } },
        orderBy:  { countedAt: "desc" },
        distinct: ["inventoryItemId"],
        select: {
          inventoryItemId: true,
          quantity:        true,
          countedAt:       true,
          storageArea:     true,
        },
      })
    : [];

  const byItem = new Map(latestCounts.map((c) => [c.inventoryItemId, c]));
  const bases = new Map<string, StockBasis>();

  for (const item of items) {
    const count = byItem.get(item.id);

    bases.set(
      item.id,
      count
        ? {
            baseline:        count.quantity,
            since:           count.countedAt,
            source:          "count",
            countedAt:       count.countedAt,
            countedQuantity: count.quantity,
            storageArea:     count.storageArea,
          }
        : {
            baseline:        item.parLevel,
            since:           dayStart,
            source:          "par",
            countedAt:       null,
            countedQuantity: null,
            storageArea:     null,
          }
    );
  }

  return bases;
}

/**
 * Compute stock from pre-fetched data, with no further DB calls.
 *
 * Rows are filtered against the basis here rather than in each caller's query:
 * every item has its own cutoff now, so a single shared `where` clause cannot
 * express it and forgetting to filter would silently double-count.
 */
export function computeStockFromData(
  basis: StockBasis,
  parLevel: number,
  safetyStock: number,
  adjustments: AdjustmentRow[],
  recipes: RecipeWithSales[]
): StockCalculation {
  const since = basis.since.getTime();

  let prepTotal = 0;
  let wasteTotal = 0;
  let manualTotal = 0;

  for (const a of adjustments) {
    if (a.createdAt.getTime() < since) continue;
    if (a.type === "PREP") prepTotal += a.quantity;
    else if (a.type === "WASTE") wasteTotal += a.quantity;
    else manualTotal += a.quantity;
  }

  let salesDepletion = 0;
  for (const recipe of recipes) {
    let sold = 0;
    for (const sale of recipe.menuItem.saleEvents) {
      if (sale.createdAt.getTime() < since) continue;
      sold += sale.quantity;
    }
    salesDepletion += sold * recipe.quantityUsed;
  }

  const currentStock = Math.max(
    0,
    basis.baseline + prepTotal - wasteTotal + manualTotal - salesDepletion
  );

  return {
    currentStock: Math.round(currentStock * 100) / 100,
    status:       getStockStatus(currentStock, parLevel, safetyStock),
    prepTotal,
    wasteTotal,
    manualTotal,
    salesDepletion,
    basis:           basis.source,
    countedAt:       basis.countedAt,
    countedQuantity: basis.countedQuantity,
    storageArea:     basis.storageArea,
  };
}

/**
 * Calculate current stock for a single item, fetching its own data.
 *
 * Prefer resolveStockBases + computeStockFromData inside list routes; this runs
 * several queries and is meant for single-item paths.
 */
export async function calculateCurrentStock(
  itemId: string
): Promise<StockCalculation> {
  const item = await prisma.inventoryItem.findUnique({
    where:  { id: itemId },
    select: { id: true, parLevel: true, safetyStock: true, locationId: true },
  });

  if (!item) {
    throw new Error(`Item not found: ${itemId}`);
  }

  const bases = await resolveStockBases(
    [{ id: item.id, parLevel: item.parLevel }],
    item.locationId
  );
  const basis = bases.get(item.id)!;

  const [adjustments, recipes] = await Promise.all([
    prisma.liveAdjustment.findMany({
      where:  { inventoryItemId: itemId, createdAt: { gte: basis.since } },
      select: { type: true, quantity: true, createdAt: true },
    }),
    prisma.recipe.findMany({
      where:  { inventoryItemId: itemId },
      select: {
        quantityUsed: true,
        menuItem: {
          select: {
            saleEvents: {
              where:  { createdAt: { gte: basis.since } },
              select: { quantity: true, createdAt: true },
            },
          },
        },
      },
    }),
  ]);

  return computeStockFromData(
    basis,
    item.parLevel,
    item.safetyStock,
    adjustments,
    recipes
  );
}

/**
 * Get stock status based on thresholds.
 */
export function getStockStatus(
  currentStock: number,
  parLevel: number,
  safetyStock: number
): StockStatus {
  if (currentStock <= 0) return "out";
  if (currentStock <= safetyStock) return "critical";
  if (currentStock <= parLevel * LOW_STOCK_FRACTION) return "low";
  return "ok";
}

/**
 * Everything the stock maths needs for a page of items, in four queries.
 *
 * Each item now counts from its own anchor, so activity is fetched once using
 * the widest anchor on the page and narrowed per item inside
 * computeStockFromData. The query count stays constant as the page grows.
 */
export interface StockInputs {
  bases:       Map<string, StockBasis>;
  adjustments: Map<string, AdjustmentRow[]>;
  recipes:     Map<string, RecipeWithSales[]>;
}

export async function loadStockInputs(
  items: { id: string; parLevel: number }[],
  locationId: string
): Promise<StockInputs> {
  const bases = await resolveStockBases(items, locationId);

  const adjustments = new Map<string, AdjustmentRow[]>();
  const recipes = new Map<string, RecipeWithSales[]>();

  if (items.length === 0) return { bases, adjustments, recipes };

  const ids = items.map((i) => i.id);
  const since = earliestBasis(bases);

  const [adjustmentRows, recipeRows] = await Promise.all([
    prisma.liveAdjustment.findMany({
      where:  { inventoryItemId: { in: ids }, createdAt: { gte: since } },
      select: {
        inventoryItemId: true,
        type:            true,
        quantity:        true,
        createdAt:       true,
      },
    }),
    prisma.recipe.findMany({
      where:  { inventoryItemId: { in: ids } },
      select: {
        inventoryItemId: true,
        quantityUsed:    true,
        menuItem: {
          select: {
            saleEvents: {
              where:  { createdAt: { gte: since } },
              select: { quantity: true, createdAt: true },
            },
          },
        },
      },
    }),
  ]);

  for (const row of adjustmentRows) {
    const list = adjustments.get(row.inventoryItemId) ?? [];
    list.push({ type: row.type, quantity: row.quantity, createdAt: row.createdAt });
    adjustments.set(row.inventoryItemId, list);
  }

  for (const row of recipeRows) {
    const list = recipes.get(row.inventoryItemId) ?? [];
    list.push({ quantityUsed: row.quantityUsed, menuItem: row.menuItem });
    recipes.set(row.inventoryItemId, list);
  }

  return { bases, adjustments, recipes };
}

/**
 * Earliest instant any of these bases counts from.
 *
 * List routes fetch adjustments and sales once for the whole page, so they need
 * the widest cutoff across the items on it; per-item filtering then happens in
 * computeStockFromData.
 */
export function earliestBasis(bases: Map<string, StockBasis>): Date {
  let earliest: number | null = null;
  for (const basis of bases.values()) {
    const t = basis.since.getTime();
    if (earliest === null || t < earliest) earliest = t;
  }
  return earliest === null ? new Date() : new Date(earliest);
}
