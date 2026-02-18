/**
 * Inventory calculation utilities
 *
 * Shared functions for computing current stock levels across the app.
 */

import prisma from "./prisma";

export type StockStatus = "ok" | "low" | "critical" | "out";

export interface StockCalculation {
  currentStock: number;
  status: StockStatus;
  prepTotal: number;
  wasteTotal: number;
  manualTotal: number;
  salesDepletion: number;
}

// ─── Types for batch helper ──────────────────────────────────────────────────

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
 * Compute stock from pre-fetched Prisma data (no extra DB calls).
 * Use this inside list routes to avoid N+1 queries.
 */
export function computeStockFromData(
  parLevel: number,
  safetyStock: number,
  adjustments: AdjustmentRow[],
  recipes: RecipeWithSales[]
): StockCalculation {
  const prepTotal = adjustments
    .filter((a) => a.type === "PREP")
    .reduce((sum, a) => sum + a.quantity, 0);

  const wasteTotal = adjustments
    .filter((a) => a.type === "WASTE")
    .reduce((sum, a) => sum + a.quantity, 0);

  const manualTotal = adjustments
    .filter((a) => a.type === "MANUAL")
    .reduce((sum, a) => sum + a.quantity, 0);

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
 * Calculate current stock level for a single inventory item (fetches its own data).
 */
export async function calculateCurrentStock(
  itemId: string
): Promise<StockCalculation> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      liveAdjustments: {
        select: { type: true, quantity: true },
      },
      recipes: {
        include: {
          menuItem: {
            include: {
              saleEvents: {
                select: { quantity: true },
              },
            },
          },
        },
      },
    },
  });

  if (!item) {
    throw new Error(`Item not found: ${itemId}`);
  }

  return computeStockFromData(
    item.parLevel,
    item.safetyStock,
    item.liveAdjustments,
    item.recipes
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
  if (currentStock <= parLevel * 0.5) return "low";
  return "ok";
}

/**
 * Estimate time until stockout based on recent sales velocity.
 */
export async function estimateDepletionTime(
  itemId: string,
  currentStock: number
): Promise<Date | null> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      recipes: {
        include: {
          menuItem: {
            include: {
              saleEvents: {
                where: { createdAt: { gte: oneDayAgo } },
                select: { quantity: true, createdAt: true },
              },
            },
          },
        },
      },
    },
  });

  if (!item) return null;

  let last24hUsage = 0;
  for (const recipe of item.recipes) {
    const sales = recipe.menuItem.saleEvents.reduce(
      (sum, s) => sum + s.quantity,
      0
    );
    last24hUsage += sales * recipe.quantityUsed;
  }

  if (last24hUsage <= 0) return null;

  const hourlyRate = last24hUsage / 24;
  const hoursUntilEmpty = currentStock / hourlyRate;

  return new Date(Date.now() + hoursUntilEmpty * 60 * 60 * 1000);
}

/**
 * Check if an alert should be created for an item.
 */
export async function shouldCreateAlert(
  itemId: string,
  alertWindowMinutes = 90
): Promise<boolean> {
  const { currentStock, status } = await calculateCurrentStock(itemId);

  if (status === "critical" || status === "out") {
    return true;
  }

  const depletionTime = await estimateDepletionTime(itemId, currentStock);
  if (depletionTime) {
    const windowEnd = new Date(Date.now() + alertWindowMinutes * 60 * 1000);
    return depletionTime <= windowEnd;
  }

  return false;
}
