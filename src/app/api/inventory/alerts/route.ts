import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { computeStockFromData, loadStockInputs } from "@/lib/inventory";
import { requireApiAuth, isSession } from "@/lib/api-auth";

const QuerySchema = z.object({
  status: z.enum(["ACTIVE", "RESOLVED", "DISMISSED", "all"]).optional(),
  limit:  z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);

    // An unrecognised ?status= used to be handed straight to Prisma as an enum
    // value, which threw and surfaced as a 500.
    const parsed = QuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      limit:  searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { status, limit } = parsed.data;

    const where = {
      inventoryItem: { locationId: auth.user.locationId },
      ...(status && status !== "all" && { status }),
    };

    const alerts = await prisma.alert.findMany({
      where,
      take:    limit,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        inventoryItem: {
          select: {
            id:          true,
            name:        true,
            unit:        true,
            safetyStock: true,
            parLevel:    true,
          },
        },
      },
    });

    // One alert per item is the norm, but the list can repeat an item, so
    // dedupe before resolving bases.
    const alertItems = [...new Map(
      alerts.map((a) => [a.inventoryItem.id, a.inventoryItem])
    ).values()];

    const { bases, adjustments, recipes } = await loadStockInputs(
      alertItems,
      auth.user.locationId
    );

    const enrichedAlerts = alerts.map((alert) => {
      const item = alert.inventoryItem;
      const calc = computeStockFromData(
        bases.get(item.id)!,
        item.parLevel,
        item.safetyStock,
        adjustments.get(item.id) ?? [],
        recipes.get(item.id) ?? []
      );
      return {
        id:                  alert.id,
        status:              alert.status,
        predictedDepletionAt: alert.predictedDepletionAt,
        createdAt:           alert.createdAt,
        inventoryItem: {
          id:           item.id,
          name:         item.name,
          unit:         item.unit,
          currentStock: calc.currentStock,
          safetyStock:  item.safetyStock,
          basis:        calc.basis,
          countedAt:    calc.countedAt,
        },
      };
    });

    return NextResponse.json({ alerts: enrichedAlerts, total: enrichedAlerts.length });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
