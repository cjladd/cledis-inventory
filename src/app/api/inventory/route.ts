import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeStockFromData } from "@/lib/inventory";
import { requireApiAuth, isSession } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status   = searchParams.get("status");
    const search   = searchParams.get("search");
    const limit    = parseInt(searchParams.get("limit") || "50");
    const offset   = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {
      isActive:   true,
      locationId: auth.user.locationId,
    };
    if (category) where.category = category;
    if (search)   where.name = { contains: search, mode: "insensitive" };

    const items = await prisma.inventoryItem.findMany({
      where,
      take:    limit,
      skip:    offset,
      orderBy: { name: "asc" },
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
    });

    const enrichedItems = items.map((item) => {
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
        status:      itemStatus,
      };
    });

    const filteredItems = status
      ? enrichedItems.filter((item) => item.status === status)
      : enrichedItems;

    return NextResponse.json({ items: filteredItems, total: filteredItems.length });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
