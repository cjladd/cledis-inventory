import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { calculateCurrentStock } from "@/lib/inventory";
import { createAlertIfNeeded } from "@/lib/forecast";
import { requireApiAuth, isSession } from "@/lib/api-auth";

const WasteReasonEnum = z.enum([
  "EXPIRED",
  "SPOILED",
  "OVERCOOKED",
  "DROPPED",
  "OVER_PREP",
  "CUSTOMER_RETURN",
  "OTHER",
]);

const WasteSchema = z.object({
  itemId:   z.string().min(1),
  quantity: z.number().positive(),
  unit:     z.string().optional(),
  reason:   WasteReasonEnum,
  note:     z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const body = await request.json();
    const data = WasteSchema.parse(body);

    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.itemId, locationId: auth.user.locationId },
    });

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const adjustment = await prisma.liveAdjustment.create({
      data: {
        type:            "WASTE",
        quantity:        data.quantity,
        unit:            data.unit ?? item.unit,
        reason:          data.reason,
        note:            data.note,
        inventoryItemId: data.itemId,
        userId:          auth.user.id,
      },
      include: {
        inventoryItem: {
          select: { name: true, unit: true, safetyStock: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action:     "WASTE",
        entityType: "LiveAdjustment",
        entityId:   adjustment.id,
        details: {
          itemName: item.name,
          quantity: data.quantity,
          unit:     data.unit ?? item.unit,
          reason:   data.reason,
        },
        locationId: item.locationId,
        userId:     auth.user.id,
      },
    });

    const { currentStock } = await calculateCurrentStock(data.itemId);
    await createAlertIfNeeded(data.itemId, currentStock, item.safetyStock);

    return NextResponse.json({
      success: true,
      adjustment: {
        id:        adjustment.id,
        type:      adjustment.type,
        quantity:  adjustment.quantity,
        unit:      adjustment.unit,
        reason:    adjustment.reason,
        itemName:  adjustment.inventoryItem.name,
        createdAt: adjustment.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error logging waste:", error);
    return NextResponse.json({ error: "Failed to log waste" }, { status: 500 });
  }
}
