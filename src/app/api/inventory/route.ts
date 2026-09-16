import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  computeStockFromData,
  locationStockWindowStart,
  type StockStatus,
} from "@/lib/inventory";
import { requireApiAuth, isSession } from "@/lib/api-auth";

const MAX_LIMIT = 200;

const QuerySchema = z.object({
  category: z.string().min(1).optional(),
  search:   z.string().min(1).optional(),
  status:   z.enum(["ok", "low", "critical", "out"]).optional(),
  limit:    z.coerce.number().int().positive().max(MAX_LIMIT).default(50),
  offset:   z.coerce.number().int().nonnegative().default(0),
});

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);

    // Unvalidated params used to reach Prisma directly: ?limit=abc became NaN
    // and ?status=bogus threw, both surfacing as a 500.
    const parsed = QuerySchema.safeParse({
      category: searchParams.get("category") ?? undefined,
      search:   searchParams.get("search") ?? undefined,
      status:   searchParams.get("status") ?? undefined,
      limit:    searchParams.get("limit") ?? undefined,
      offset:   searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { category, search, status, limit, offset } = parsed.data;
    const since = await locationStockWindowStart(auth.user.locationId);

    // Status is derived, not stored, so it cannot be filtered or paginated in
    // SQL. Fetch the location's items, compute, then filter and page in memory
    // — previously the page was taken first and the status filter applied
    // after, so a page could come back short and `total` counted only the page.
    const items = await prisma.inventoryItem.findMany({
      where: {
        isActive:   true,
        locationId: auth.user.locationId,
        ...(category && { category }),
        ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      },
      orderBy: { name: "asc" },
      select: {
        id:          true,
        name:        true,
        unit:        true,
        parLevel:    true,
        safetyStock: true,
        category:    true,
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
    });

    const enriched = items.map((item) => {
      const { currentStock, status: itemStatus } = computeStockFromData(
        item.parLevel,
        item.safetyStock,
        item.liveAdjustments,
        item.recipes
      );
      return {
        id:          item.id,
        name:        item.name,
        unit:        item.unit,
        parLevel:    item.parLevel,
        safetyStock: item.safetyStock,
        category:    item.category,
        currentStock,
        status:      itemStatus as StockStatus,
      };
    });

    const matching = status
      ? enriched.filter((item) => item.status === status)
      : enriched;

    return NextResponse.json({
      items:      matching.slice(offset, offset + limit),
      total:      matching.length,
      countedFrom: since.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
