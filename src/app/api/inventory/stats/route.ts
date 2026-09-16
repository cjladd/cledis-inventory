import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeStockFromData, locationStockWindowStart } from "@/lib/inventory";
import { requireApiAuth, isSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const locationId = auth.user.locationId;

    // One boundary for both the stock totals and the prep counter. These used
    // to disagree: preps counted from server-local midnight while stock counted
    // from the beginning of time.
    const since = await locationStockWindowStart(locationId);

    const [items, activeAlerts, todayPreps] = await Promise.all([
      prisma.inventoryItem.findMany({
        where:   { isActive: true, locationId },
        select: {
          parLevel:    true,
          safetyStock: true,
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
      prisma.alert.count({
        where: {
          status: "ACTIVE",
          inventoryItem: { locationId },
        },
      }),
      prisma.liveAdjustment.count({
        where: {
          type:      "PREP",
          createdAt: { gte: since },
          inventoryItem: { locationId },
        },
      }),
    ]);

    const statusCounts = { ok: 0, low: 0, critical: 0, out: 0 };

    for (const item of items) {
      const { status } = computeStockFromData(
        item.parLevel,
        item.safetyStock,
        item.liveAdjustments,
        item.recipes
      );
      statusCounts[status]++;
    }

    return NextResponse.json({
      totalItems:    items.length,
      lowStock:      statusCounts.low,
      criticalStock: statusCounts.critical,
      outOfStock:    statusCounts.out,
      activeAlerts,
      todayPreps,
      countedFrom: since.toISOString(),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
