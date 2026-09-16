import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth, requireApiRole, isSession } from "@/lib/api-auth";
import {
  updateForecastSnapshots,
  predictDepletionFromRates,
  calculateDayOfWeekRatesForLocation,
} from "@/lib/forecast";
import { computeStockFromData, locationStockWindowStart } from "@/lib/inventory";

// GET /api/inventory/forecast - return forecast data for all items
export async function GET() {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const locationId = auth.user.locationId;
    const since = await locationStockWindowStart(locationId);

    // Three queries for the whole location. This route used to run two queries
    // per item inside a Promise.all, so a location with 44 items issued ~90.
    const [items, ratesByItem] = await Promise.all([
      prisma.inventoryItem.findMany({
        where:  { locationId, isActive: true },
        orderBy: { name: "asc" },
        select: {
          id:          true,
          name:        true,
          unit:        true,
          parLevel:    true,
          safetyStock: true,
          forecastSnapshots: {
            select: {
              dayOfWeek:    true,
              avgSalesRate: true,
              seasonality:  true,
            },
            orderBy: { dayOfWeek: "asc" },
          },
          liveAdjustments: {
            where:  { createdAt: { gte: since } },
            select: { type: true, quantity: true },
          },
          recipes: {
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
          },
        },
      }),
      calculateDayOfWeekRatesForLocation(locationId),
    ]);

    const forecasts = items.map((item) => {
      const { currentStock } = computeStockFromData(
        item.parLevel,
        item.safetyStock,
        item.liveAdjustments,
        item.recipes
      );

      const rates = ratesByItem.get(item.id) ?? {
        rates:      [0, 0, 0, 0, 0, 0, 0],
        overallAvg: 0,
      };

      return {
        itemId:   item.id,
        itemName: item.name,
        unit:     item.unit,
        currentStock,
        predictedDepletionAt: predictDepletionFromRates(currentStock, rates),
        snapshots: item.forecastSnapshots,
      };
    });

    return NextResponse.json({ forecasts, countedFrom: since.toISOString() });
  } catch (error) {
    console.error("Forecast GET error:", error);
    return NextResponse.json({ error: "Failed to fetch forecasts" }, { status: 500 });
  }
}

// POST /api/inventory/forecast - trigger recalculation (manager+ only)
export async function POST() {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    await updateForecastSnapshots(auth.user.locationId);
    return NextResponse.json({ success: true, message: "Forecast snapshots updated" });
  } catch (error) {
    console.error("Forecast POST error:", error);
    return NextResponse.json({ error: "Failed to update forecasts" }, { status: 500 });
  }
}
