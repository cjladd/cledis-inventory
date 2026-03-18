/**
 * Forecasting engine — moving averages + day-of-week seasonality.
 *
 * Uses SaleEvent data to calculate average daily depletion rates and
 * day-of-week patterns, then predicts when stock will hit zero.
 */

import prisma from "./prisma";

export interface DayOfWeekRates {
  rates:      number[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  overallAvg: number;
}

export interface ForecastResult {
  avgDailyDepletion:  number;
  dayOfWeekRates:     number[];
  seasonality:        number[]; // multiplier per day-of-week
  predictedDepletionAt: Date | null;
}

/**
 * Calculate average daily depletion over the past N days.
 */
export async function calculateMovingAverage(
  itemId: string,
  windowDays = 14
): Promise<number> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const recipes = await prisma.recipe.findMany({
    where: { inventoryItemId: itemId },
    select: {
      quantityUsed: true,
      menuItem: {
        select: {
          saleEvents: {
            where:  { createdAt: { gte: since } },
            select: { quantity: true, createdAt: true },
          },
        },
      },
    },
  });

  // Group total depletion by calendar day
  const dailyTotals = new Map<string, number>();

  for (const recipe of recipes) {
    for (const sale of recipe.menuItem.saleEvents) {
      const day = sale.createdAt.toISOString().slice(0, 10);
      const depletion = sale.quantity * recipe.quantityUsed;
      dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + depletion);
    }
  }

  if (dailyTotals.size === 0) return 0;

  const total = [...dailyTotals.values()].reduce((sum, v) => sum + v, 0);
  return total / windowDays; // avg per day over the full window (not just active days)
}

/**
 * Calculate average depletion rate per day-of-week over the past N weeks.
 * Returns an array of 7 values [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
 */
export async function calculateDayOfWeekRates(
  itemId: string,
  windowWeeks = 4
): Promise<DayOfWeekRates> {
  const since = new Date(Date.now() - windowWeeks * 7 * 24 * 60 * 60 * 1000);

  const recipes = await prisma.recipe.findMany({
    where: { inventoryItemId: itemId },
    select: {
      quantityUsed: true,
      menuItem: {
        select: {
          saleEvents: {
            where:  { createdAt: { gte: since } },
            select: { quantity: true, createdAt: true },
          },
        },
      },
    },
  });

  // Accumulate depletion by day-of-week
  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const recipe of recipes) {
    for (const sale of recipe.menuItem.saleEvents) {
      const dow = sale.createdAt.getDay();
      dowTotals[dow] += sale.quantity * recipe.quantityUsed;
    }
  }

  // Count how many of each day-of-week fall in the window
  const msPerDay = 24 * 60 * 60 * 1000;
  for (let i = 0; i < windowWeeks * 7; i++) {
    const d = new Date(since.getTime() + i * msPerDay);
    dowCounts[d.getDay()]++;
  }

  const rates = dowTotals.map((total, i) =>
    dowCounts[i] > 0 ? total / dowCounts[i] : 0
  );

  const overallAvg = rates.reduce((sum, r) => sum + r, 0) / 7;

  return { rates, overallAvg };
}

/**
 * Calculate seasonality multipliers from day-of-week rates.
 * seasonality[i] = rates[i] / overallAvg (>1 = busier than average).
 */
export function calculateSeasonality(
  rates: number[],
  overallAvg: number
): number[] {
  if (overallAvg <= 0) return [1, 1, 1, 1, 1, 1, 1];
  return rates.map((r) => r / overallAvg);
}

/**
 * Predict when stock will hit zero given current stock and forecast data.
 * Returns null if no sales history.
 */
export async function predictDepletion(
  itemId: string,
  currentStock: number
): Promise<Date | null> {
  if (currentStock <= 0) return new Date();

  const { rates, overallAvg } = await calculateDayOfWeekRates(itemId);
  const seasonality = calculateSeasonality(rates, overallAvg);

  if (overallAvg <= 0) return null;

  // Walk forward hour by hour, depleting stock using today's hourly rate
  const hourlyOverallRate = overallAvg / 24;
  if (hourlyOverallRate <= 0) return null;

  let remaining = currentStock;
  let now = new Date();

  // Simulate up to 30 days ahead
  for (let h = 0; h < 30 * 24; h++) {
    const dow = now.getDay();
    const hourlyRate = hourlyOverallRate * seasonality[dow];
    remaining -= hourlyRate;
    now = new Date(now.getTime() + 60 * 60 * 1000);
    if (remaining <= 0) return now;
  }

  return null; // won't deplete in 30 days
}

/**
 * Recalculate ForecastSnapshot records for all active items in a location.
 */
export async function updateForecastSnapshots(locationId: string): Promise<void> {
  const items = await prisma.inventoryItem.findMany({
    where:  { locationId, isActive: true },
    select: { id: true },
  });

  for (const item of items) {
    const { rates, overallAvg } = await calculateDayOfWeekRates(item.id);
    const seasonality = calculateSeasonality(rates, overallAvg);

    for (let dow = 0; dow < 7; dow++) {
      await prisma.forecastSnapshot.upsert({
        where: {
          inventoryItemId_dayOfWeek: {
            inventoryItemId: item.id,
            dayOfWeek:       dow,
          },
        },
        update: {
          avgSalesRate: rates[dow] / 24, // convert daily → hourly
          seasonality:  seasonality[dow],
        },
        create: {
          inventoryItemId: item.id,
          dayOfWeek:       dow,
          avgSalesRate:    rates[dow] / 24,
          seasonality:     seasonality[dow],
        },
      });
    }
  }
}

/**
 * Create an alert for an item if warranted, using forecast-based depletion time.
 * Skips if an ACTIVE alert already exists.
 */
export async function createAlertIfNeeded(
  itemId: string,
  currentStock: number,
  safetyStock: number
): Promise<void> {
  if (currentStock > safetyStock) return;

  const existing = await prisma.alert.findFirst({
    where: { inventoryItemId: itemId, status: "ACTIVE" },
  });
  if (existing) return;

  const depletionAt = await predictDepletion(itemId, currentStock);
  // Fall back to 1 hour if no forecast data
  const predictedDepletionAt = depletionAt ?? new Date(Date.now() + 60 * 60 * 1000);

  await prisma.alert.create({
    data: {
      inventoryItemId:     itemId,
      status:              "ACTIVE",
      predictedDepletionAt,
    },
  });
}
