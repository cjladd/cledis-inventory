/**
 * Inventory calculation utilities
 *
 * Shared functions for computing current stock levels across the app.
 *
 * Stock is derived as: par level, plus prep, minus waste and sales, counted
 * from the start of the current service day. See lib/service-day.ts for why
 * that boundary exists and what replaces it once physical counts are modelled.
 */

import prisma from "./prisma";
import { stockWindowStart } from "./service-day";

export type StockStatus = "ok" | "low" | "critical" | "out";

/** Below this fraction of par, an item reads as "low". */
const LOW_STOCK_FRACTION = 0.5;

export interface StockCalculation {
  currentStock: number;
  status: StockStatus;
  prepTotal: number;
  wasteTotal: number;
  manualTotal: number;
  salesDepletion: number;
}

// --- Types for batch helper -------------------------------------------------

export interface AdjustmentRow {
  type: "PREP" | "WASTE" | "MANUAL";
  quantity: number;
}

export interface RecipeWithSales {
  quantityUsed: number;
  menuItem: {
    saleEvents: { quantity: number }[];
  };
}

/**
 * Start of the window that stock is counted from, for one location.
 *
 * Every route that totals adjustments or sales must scope its queries to this
 * instant. Without it the totals run over all history, so the number drifts
 * further from reality every day and each request loads the entire ledger.
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
 * Compute stock from pre-fetched Prisma data (no extra DB calls).
 *
 * Callers are responsible for scoping `adjustments` and `recipes[].menuItem
 * .saleEvents` to the stock window; this function just totals what it is given.
 */
export function computeStockFromData(
  parLevel: number,
  safetyStock: number,
  adjustments: AdjustmentRow[],
  recipes: RecipeWithSales[]
): StockCalculation {
  let prepTotal = 0;
  let wasteTotal = 0;
  let manualTotal = 0;

  for (const a of adjustments) {
    if (a.type === "PREP") prepTotal += a.quantity;
    else if (a.type === "WASTE") wasteTotal += a.quantity;
    else manualTotal += a.quantity;
  }

  let salesDepletion = 0;
  for (const recipe of recipes) {
    const menuItemSales = recipe.menuItem.saleEvents.reduce(
      (sum, s) => sum + s.quantity,
      0
    );
    salesDepletion += menuItemSales * recipe.quantityUsed;
  }

  const currentStock = Math.max(
    0,
    parLevel + prepTotal - wasteTotal + manualTotal - salesDepletion
  );

  const status = getStockStatus(currentStock, parLevel, safetyStock);

  return {
    currentStock: Math.round(currentStock * 100) / 100,
    status,
    prepTotal,
    wasteTotal,
    manualTotal,
    salesDepletion,
  };
}

/**
 * Calculate current stock for a single item, fetching its own data.
 *
 * Prefer computeStockFromData inside list routes; this runs two queries and is
 * meant for single-item paths.
 */
export async function calculateCurrentStock(
  itemId: string
): Promise<StockCalculation> {
  const item = await prisma.inventoryItem.findUnique({
    where:  { id: itemId },
    select: { parLevel: true, safetyStock: true, locationId: true },
  });

  if (!item) {
    throw new Error(`Item not found: ${itemId}`);
  }

  const since = await locationStockWindowStart(item.locationId);

  const [adjustments, recipes] = await Promise.all([
    prisma.liveAdjustment.findMany({
      where:  { inventoryItemId: itemId, createdAt: { gte: since } },
      select: { type: true, quantity: true },
    }),
    prisma.recipe.findMany({
      where:  { inventoryItemId: itemId },
      select: {
        quantityUsed: true,
        menuItem: {
          select: {
            saleEvents: {
              where:  { createdAt: { gte: since } },
              select: { quantity: true },
            },
          },
        },
      },
    }),
  ]);

  return computeStockFromData(
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
