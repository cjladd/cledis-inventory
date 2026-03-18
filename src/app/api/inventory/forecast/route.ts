import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth, requireApiRole, isSession } from "@/lib/api-auth";
import { updateForecastSnapshots, predictDepletion } from "@/lib/forecast";
import { calculateCurrentStock } from "@/lib/inventory";

// GET /api/inventory/forecast — return forecast data for all items
export async function GET() {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const items = await prisma.inventoryItem.findMany({
      where:   { locationId: auth.user.locationId, isActive: true },
      select: {
        id:   true,
        name: true,
        unit: true,
        forecastSnapshots: {
          select: {
            dayOfWeek:   true,
            avgSalesRate: true,
            seasonality:  true,
          },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    const forecasts = await Promise.all(
      items.map(async (item) => {
        const { currentStock } = await calculateCurrentStock(item.id);
        const depletionAt = await predictDepletion(item.id, currentStock);
        return {
          itemId:       item.id,
          itemName:     item.name,
          unit:         item.unit,
          currentStock,
          predictedDepletionAt: depletionAt,
          snapshots:    item.forecastSnapshots,
        };
      })
    );

    return NextResponse.json({ forecasts });
  } catch (error) {
    console.error("Forecast GET error:", error);
    return NextResponse.json({ error: "Failed to fetch forecasts" }, { status: 500 });
  }
}

// POST /api/inventory/forecast — trigger recalculation (manager+ only)
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
