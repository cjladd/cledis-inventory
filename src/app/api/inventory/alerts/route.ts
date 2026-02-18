import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const alerts = await prisma.alert.findMany({
      where,
      take: limit,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            unit: true,
            safetyStock: true,
            parLevel: true,
            liveAdjustments: {
              select: { type: true, quantity: true },
            },
          },
        },
      },
    });

    // Enrich with current stock calculation
    const enrichedAlerts = alerts.map((alert) => {
      const item = alert.inventoryItem;
      const prepTotal = item.liveAdjustments
        .filter((a) => a.type === "PREP")
        .reduce((sum, a) => sum + a.quantity, 0);
      const wasteTotal = item.liveAdjustments
        .filter((a) => a.type === "WASTE")
        .reduce((sum, a) => sum + a.quantity, 0);
      const currentStock = Math.max(0, item.parLevel + prepTotal - wasteTotal);

      return {
        id: alert.id,
        status: alert.status,
        predictedDepletionAt: alert.predictedDepletionAt,
        createdAt: alert.createdAt,
        inventoryItem: {
          id: item.id,
          name: item.name,
          unit: item.unit,
          currentStock: Math.round(currentStock * 100) / 100,
          safetyStock: item.safetyStock,
        },
      };
    });

    return NextResponse.json({
      alerts: enrichedAlerts,
      total: enrichedAlerts.length,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
