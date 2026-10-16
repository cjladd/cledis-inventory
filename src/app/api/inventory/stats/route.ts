import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  computeStockFromData,
  loadStockInputs,
  locationStockWindowStart,
} from "@/lib/inventory";
import { requireApiAuth, isSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const locationId = auth.user.locationId;

    // The service day still bounds genuinely day-scoped figures like "preps
    // logged today". Stock itself counts from each item's own last count.
    const dayStart = await locationStockWindowStart(locationId);

    const [items, activeAlerts, todayPreps] = await Promise.all([
      prisma.inventoryItem.findMany({
        where:  { isActive: true, locationId },
        select: { id: true, parLevel: true, safetyStock: true },
      }),
      prisma.alert.count({
        where: { status: "ACTIVE", inventoryItem: { locationId } },
      }),
      prisma.liveAdjustment.count({
        where: {
          type:          "PREP",
          createdAt:     { gte: dayStart },
          inventoryItem: { locationId },
        },
      }),
    ]);

    const { bases, adjustments, recipes } = await loadStockInputs(items, locationId);

    const statusCounts = { ok: 0, low: 0, critical: 0, out: 0 };
    let countedItems = 0;

    for (const item of items) {
      const calc = computeStockFromData(
        bases.get(item.id)!,
        item.parLevel,
        item.safetyStock,
        adjustments.get(item.id) ?? [],
        recipes.get(item.id) ?? []
      );
      statusCounts[calc.status]++;
      if (calc.basis === "count") countedItems++;
    }

    return NextResponse.json({
      totalItems:    items.length,
      lowStock:      statusCounts.low,
      criticalStock: statusCounts.critical,
      outOfStock:    statusCounts.out,
      activeAlerts,
      todayPreps,
      // How much of the picture rests on an actual count rather than par.
      countedItems,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
