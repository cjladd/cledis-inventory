/**
 * Forecasting engine - moving averages + day-of-week seasonality.
 *
 * Uses SaleEvent data to calculate average daily depletion rates and
 * day-of-week patterns, then predicts when stock will hit zero.
 */

import prisma from "./prisma";

export interface DayOfWeekRates {
  rates:      number[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  overallAvg: number;
}

const FLAT_SEASONALITY = [1, 1, 1, 1, 1, 1, 1];
const DEFAULT_WINDOW_WEEKS = 4;
const MAX_FORECAST_DAYS = 30;

const emptyRates = (): DayOfWeekRates => ({
  rates:      [0, 0, 0, 0, 0, 0, 0],
  overallAvg: 0,
});

/** How many of each weekday fall inside the lookback window. */
function weekdayCounts(since: Date, windowWeeks: number): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const msPerDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < windowWeeks * 7; i++) {
    counts[new Date(since.getTime() + i * msPerDay).getDay()]++;
  }
  return counts;
}

function ratesFromTotals(dowTotals: number[], dowCounts: number[]): DayOfWeekRates {
  const rates = dowTotals.map((total, i) => (dowCounts[i] > 0 ? total / dowCounts[i] : 0));
  return {
    rates,
    overallAvg: rates.reduce((sum, r) => sum + r, 0) / 7,
  };
}

/**
 * Day-of-week depletion rates for every item at a location, in one query.
 *
 * The per-item version below runs a query each time it is called; computing a
 * whole location item-by-item meant one round trip per item on every request.
 */
export async function calculateDayOfWeekRatesForLocation(
  locationId: string,
  windowWeeks = DEFAULT_WINDOW_WEEKS
): Promise<Map<string, DayOfWeekRates>> {
  const since = new Date(Date.now() - windowWeeks * 7 * 24 * 60 * 60 * 1000);

  const recipes = await prisma.recipe.findMany({
    where:  { inventoryItem: { locationId } },
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
  });

  const totalsByItem = new Map<string, number[]>();

  for (const recipe of recipes) {
    let totals = totalsByItem.get(recipe.inventoryItemId);
    if (!totals) {
      totals = [0, 0, 0, 0, 0, 0, 0];
      totalsByItem.set(recipe.inventoryItemId, totals);
    }
    for (const sale of recipe.menuItem.saleEvents) {
      totals[sale.createdAt.getDay()] += sale.quantity * recipe.quantityUsed;
    }
  }

  const counts = weekdayCounts(since, windowWeeks);
  const result = new Map<string, DayOfWeekRates>();

  for (const [itemId, totals] of totalsByItem) {
    result.set(itemId, ratesFromTotals(totals, counts));
  }
  return result;
}

/**
 * Day-of-week depletion rates for a single item.
 */
export async function calculateDayOfWeekRates(
  itemId: string,
  windowWeeks = DEFAULT_WINDOW_WEEKS
): Promise<DayOfWeekRates> {
  const since = new Date(Date.now() - windowWeeks * 7 * 24 * 60 * 60 * 1000);

  const recipes = await prisma.recipe.findMany({
    where:  { inventoryItemId: itemId },
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

  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  for (const recipe of recipes) {
    for (const sale of recipe.menuItem.saleEvents) {
      dowTotals[sale.createdAt.getDay()] += sale.quantity * recipe.quantityUsed;
    }
  }

  return ratesFromTotals(dowTotals, weekdayCounts(since, windowWeeks));
}

/**
 * Seasonality multipliers from day-of-week rates (>1 = busier than average).
 */
export function calculateSeasonality(rates: number[], overallAvg: number): number[] {
  if (overallAvg <= 0) return [...FLAT_SEASONALITY];
  return rates.map((r) => r / overallAvg);
}

/**
 * Predict when stock hits zero, given already-computed rates.
 *
 * Walks forward a day at a time and interpolates within the day it runs out,
 * rather than stepping hour by hour for 720 iterations.
 */
export function predictDepletionFromRates(
  currentStock: number,
  { rates, overallAvg }: DayOfWeekRates,
  now: Date = new Date()
): Date | null {
  if (currentStock <= 0) return now;
  if (overallAvg <= 0) return null;

  const seasonality = calculateSeasonality(rates, overallAvg);

  let remaining = currentStock;
  let cursor = now;

  for (let day = 0; day < MAX_FORECAST_DAYS; day++) {
    const hourlyRate = (overallAvg * seasonality[cursor.getDay()]) / 24;

    const endOfDay = new Date(cursor);
    endOfDay.setHours(24, 0, 0, 0);

    const hoursLeft = (endOfDay.getTime() - cursor.getTime()) / 3_600_000;
    const consumable = hourlyRate * hoursLeft;

    if (hourlyRate > 0 && remaining <= consumable) {
      return new Date(cursor.getTime() + (remaining / hourlyRate) * 3_600_000);
    }

    remaining -= consumable;
    cursor = endOfDay;
  }

  return null; // will not deplete inside the forecast horizon
}

/**
 * Predict depletion for one item, fetching its rates.
 */
export async function predictDepletion(
  itemId: string,
  currentStock: number
): Promise<Date | null> {
  if (currentStock <= 0) return new Date();
  return predictDepletionFromRates(currentStock, await calculateDayOfWeekRates(itemId));
}

/**
 * Recalculate ForecastSnapshot rows for every active item in a location.
 */
export async function updateForecastSnapshots(locationId: string): Promise<void> {
  const [items, ratesByItem] = await Promise.all([
    prisma.inventoryItem.findMany({
      where:  { locationId, isActive: true },
      select: { id: true },
    }),
    calculateDayOfWeekRatesForLocation(locationId),
  ]);

  // One transaction of upserts rather than items x 7 sequential round trips.
  const writes = items.flatMap((item) => {
    const { rates, overallAvg } = ratesByItem.get(item.id) ?? emptyRates();
    const seasonality = calculateSeasonality(rates, overallAvg);

    return Array.from({ length: 7 }, (_, dow) => {
      const avgSalesRate = rates[dow] / 24; // daily -> hourly
      return prisma.forecastSnapshot.upsert({
        where: {
          inventoryItemId_dayOfWeek: { inventoryItemId: item.id, dayOfWeek: dow },
        },
        update: { avgSalesRate, seasonality: seasonality[dow] },
        create: {
          inventoryItemId: item.id,
          dayOfWeek:       dow,
          avgSalesRate,
          seasonality:     seasonality[dow],
        },
      });
    });
  });

  await prisma.$transaction(writes);
}

/**
 * Create an alert for an item if warranted. Skips if one is already ACTIVE.
 *
 * Fires either when stock is at or below safety, or when it is forecast to run
 * out inside the location's alert window - the window is configurable in
 * settings and was previously never read.
 */
export async function createAlertIfNeeded(
  itemId: string,
  currentStock: number,
  safetyStock: number
): Promise<void> {
  const item = await prisma.inventoryItem.findUnique({
    where:  { id: itemId },
    select: { location: { select: { alertWindowMinutes: true } } },
  });

  const alertWindowMinutes = item?.location.alertWindowMinutes ?? 60;
  const depletionAt = await predictDepletion(itemId, currentStock);

  const windowEnd = new Date(Date.now() + alertWindowMinutes * 60 * 1000);
  const belowSafety = currentStock <= safetyStock;
  const depletingSoon = depletionAt !== null && depletionAt <= windowEnd;

  if (!belowSafety && !depletingSoon) return;

  const existing = await prisma.alert.findFirst({
    where:  { inventoryItemId: itemId, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) return;

  await prisma.alert.create({
    data: {
      inventoryItemId:      itemId,
      status:               "ACTIVE",
      predictedDepletionAt: depletionAt ?? windowEnd,
    },
  });
}
