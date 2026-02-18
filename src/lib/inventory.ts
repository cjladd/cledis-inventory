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

/**
 * Calculate current stock level for an inventory item
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

  // Sum adjustments by type
  const prepTotal = item.liveAdjustments
    .filter((a) => a.type === "PREP")
    .reduce((sum, a) => sum + a.quantity, 0);

  const wasteTotal = item.liveAdjustments
    .filter((a) => a.type === "WASTE")
    .reduce((sum, a) => sum + a.quantity, 0);

  const manualTotal = item.liveAdjustments
    .filter((a) => a.type === "MANUAL")
    .reduce((sum, a) => sum + a.quantity, 0);

  // Calculate sales depletion from recipes
  let salesDepletion = 0;
  for (const recipe of item.recipes) {
    const menuItemSales = recipe.menuItem.saleEvents.reduce(
      (sum, s) => sum + s.quantity,
      0
    );
    salesDepletion += menuItemSales * recipe.quantityUsed;
  }

  // Current stock = par + prep - waste + manual - sales
  const currentStock = Math.max(
    0,
    item.parLevel + prepTotal - wasteTotal + manualTotal - salesDepletion
  );

  const status = getStockStatus(currentStock, item.parLevel, item.safetyStock);

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
 * Get stock status based on thresholds
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
 * Estimate time until stockout based on sales velocity
 */
export async function estimateDepletionTime(
  itemId: string,
  currentStock: number
): Promise<Date | null> {
  // Get recent sales to calculate velocity
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

  // Calculate usage in last 24 hours
  let last24hUsage = 0;
  for (const recipe of item.recipes) {
    const sales = recipe.menuItem.saleEvents.reduce(
      (sum, s) => sum + s.quantity,
      0
    );
    last24hUsage += sales * recipe.quantityUsed;
  }

  if (last24hUsage <= 0) {
    // No recent sales, can't estimate
    return null;
  }

  // Calculate hourly rate and time to depletion
  const hourlyRate = last24hUsage / 24;
  const hoursUntilEmpty = currentStock / hourlyRate;

  return new Date(Date.now() + hoursUntilEmpty * 60 * 60 * 1000);
}

/**
 * Check if an alert should be created for an item
 */
export async function shouldCreateAlert(
  itemId: string,
  alertWindowMinutes: number = 90
): Promise<boolean> {
  const { currentStock, status } = await calculateCurrentStock(itemId);

  // Already critical or out
  if (status === "critical" || status === "out") {
    return true;
  }

  // Check if predicted to run out within alert window
  const depletionTime = await estimateDepletionTime(itemId, currentStock);
  if (depletionTime) {
    const windowEnd = new Date(Date.now() + alertWindowMinutes * 60 * 1000);
    return depletionTime <= windowEnd;
  }

  return false;
}
