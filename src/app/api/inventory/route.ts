import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStockStatus } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    if (locationId) where.locationId = locationId;
    if (category) where.category = category;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Fetch items
    const items = await prisma.inventoryItem.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { name: "asc" },
      include: {
        liveAdjustments: {
          select: { type: true, quantity: true },
        },
        recipes: {
          include: {
            menuItem: {
              include: {
                saleEvents: {
                  select: { quantity: true },
                },
              },
            },
          },
        },
      },
    });

    // Calculate current stock for each item
    const enrichedItems = items.map((item) => {
      // Sum prep adjustments (add)
      const prepTotal = item.liveAdjustments
        .filter((a) => a.type === "PREP")
        .reduce((sum, a) => sum + a.quantity, 0);

      // Sum waste adjustments (subtract)
      const wasteTotal = item.liveAdjustments
        .filter((a) => a.type === "WASTE")
        .reduce((sum, a) => sum + a.quantity, 0);

      // Sum manual adjustments
      const manualTotal = item.liveAdjustments
        .filter((a) => a.type === "MANUAL")
        .reduce((sum, a) => sum + a.quantity, 0);

      // Calculate sales depletion from recipes
      let salesDepletion = 0;
      for (const recipe of item.recipes) {
        const menuItemSales = recipe.menuItem.saleEvents.reduce(
          (sum, s) => sum + s.quantity,
          0
        );
        salesDepletion += menuItemSales * recipe.quantityUsed;
      }

      // Current stock = par + prep - waste + manual - sales
      const currentStock = Math.max(
        0,
        item.parLevel + prepTotal - wasteTotal + manualTotal - salesDepletion
      );

      const itemStatus = getStockStatus(
        currentStock,
        item.parLevel,
        item.safetyStock
      );

      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        parLevel: item.parLevel,
        safetyStock: item.safetyStock,
        category: item.category,
        currentStock: Math.round(currentStock * 100) / 100,
        status: itemStatus,
      };
    });

    // Filter by status if requested
    let filteredItems = enrichedItems;
    if (status) {
      filteredItems = enrichedItems.filter((item) => item.status === status);
    }

    return NextResponse.json({
      items: filteredItems,
      total: filteredItems.length,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
