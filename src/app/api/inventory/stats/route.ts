import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeStockFromData } from "@/lib/inventory";
import { requireApiAuth, isSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const now        = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const locationId = auth.user.locationId;

    const [items, activeAlerts, todayPreps] = await Promise.all([
      prisma.inventoryItem.findMany({
        where:   { isActive: true, locationId },
        include: {
          liveAdjustments: { select: { type: true, quantity: true } },
          recipes: {
            include: {
              menuItem: {
                include: { saleEvents: { select: { quantity: true } } },
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
          createdAt: { gte: startOfDay },
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
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
