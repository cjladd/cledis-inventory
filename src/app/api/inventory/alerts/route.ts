import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { computeStockFromData, locationStockWindowStart } from "@/lib/inventory";
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
    const since = await locationStockWindowStart(auth.user.locationId);

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
        },
      },
    });

    const enrichedAlerts = alerts.map((alert) => {
      const item = alert.inventoryItem;
      const { currentStock } = computeStockFromData(
        item.parLevel,
        item.safetyStock,
        item.liveAdjustments,
        item.recipes
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
          currentStock,
          safetyStock:  item.safetyStock,
        },
      };
    });

    return NextResponse.json({ alerts: enrichedAlerts, total: enrichedAlerts.length });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
