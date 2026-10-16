import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { calculateCurrentStock } from "@/lib/inventory";
import { createAlertIfNeeded } from "@/lib/forecast";
import { requireApiAuth, isSession } from "@/lib/api-auth";

const CountSchema = z.object({
  itemId:      z.string().min(1),
  // Zero is a legitimate count - "we are out of this" is information.
  quantity:    z.number().nonnegative(),
  unit:        z.string().optional(),
  storageArea: z.enum(["COOLER", "LINE", "DRY", "WALKIN"]).default("COOLER"),
  countType:   z.enum(["ORDER", "PREP"]),
  note:        z.string().max(500).optional(),
});

/**
 * Record a physical count.
 *
 * This is the anchor every later stock figure counts forward from, so it is
 * deliberately an append-only event: a correction is a new count, not an edit.
 * That keeps the history of what was actually observed, and when.
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const body = await request.json();
    const data = CountSchema.parse(body);

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id:         data.itemId,
        locationId: auth.user.locationId,
        isActive:   true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    // Same guard as prep and waste: a quantity is meaningless against a unit
    // the item is not measured in.
    if (data.unit && data.unit !== item.unit) {
      return NextResponse.json(
        { error: `Unit mismatch: ${item.name} is measured in ${item.unit}` },
        { status: 400 }
      );
    }

    const count = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryCount.create({
        data: {
          inventoryItemId: item.id,
          userId:          auth.user.id,
          quantity:        data.quantity,
          unit:            item.unit,
          storageArea:     data.storageArea,
          countType:       data.countType,
          note:            data.note,
        },
        select: {
          id:          true,
          quantity:    true,
          unit:        true,
          storageArea: true,
          countType:   true,
          countedAt:   true,
        },
      });

      await tx.auditLog.create({
        data: {
          action:     "COUNT",
          entityType: "InventoryCount",
          entityId:   created.id,
          details: {
            itemName:    item.name,
            quantity:    data.quantity,
            unit:        item.unit,
            storageArea: data.storageArea,
            countType:   data.countType,
          },
          locationId: item.locationId,
          userId:     auth.user.id,
        },
      });

      return created;
    });

    // The count re-anchors stock, so an item can become critical (or stop
    // being critical) the moment it is counted.
    const stock = await calculateCurrentStock(item.id);
    await createAlertIfNeeded(item.id, stock.currentStock, item.safetyStock);

    return NextResponse.json({
      success: true,
      count,
      stock: {
        currentStock: stock.currentStock,
        status:       stock.status,
        basis:        stock.basis,
        countedAt:    stock.countedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error recording count:", error);
    return NextResponse.json({ error: "Failed to record count" }, { status: 500 });
  }
}

/**
 * Recent counts for the location, newest first. Used by the count screen to
 * show what has already been done this session.
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const limit = Math.min(
      200,
      Math.max(1, parseInt(new URL(request.url).searchParams.get("limit") ?? "50", 10) || 50)
    );

    const counts = await prisma.inventoryCount.findMany({
      where:   { inventoryItem: { locationId: auth.user.locationId } },
      orderBy: { countedAt: "desc" },
      take:    limit,
      select: {
        id:          true,
        quantity:    true,
        unit:        true,
        storageArea: true,
        countType:   true,
        countedAt:   true,
        inventoryItem: { select: { id: true, name: true } },
        user:          { select: { name: true } },
      },
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("Error fetching counts:", error);
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}
