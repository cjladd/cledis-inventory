import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireApiAuth, isSession } from "@/lib/api-auth";

const PrepSchema = z.object({
  itemId:   z.string().min(1),
  quantity: z.number().positive(),
  unit:     z.string().optional(),
  note:     z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const body = await request.json();
    const data = PrepSchema.parse(body);

    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.itemId, locationId: auth.user.locationId },
    });

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const adjustment = await prisma.liveAdjustment.create({
      data: {
        type:            "PREP",
        quantity:        data.quantity,
        unit:            data.unit ?? item.unit,
        note:            data.note,
        inventoryItemId: data.itemId,
        userId:          auth.user.id,
      },
      include: {
        inventoryItem: { select: { name: true, unit: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action:     "PREP",
        entityType: "LiveAdjustment",
        entityId:   adjustment.id,
        details: {
          itemName: item.name,
          quantity: data.quantity,
          unit:     data.unit ?? item.unit,
        },
        locationId: item.locationId,
        userId:     auth.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      adjustment: {
        id:        adjustment.id,
        type:      adjustment.type,
        quantity:  adjustment.quantity,
        unit:      adjustment.unit,
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
    console.error("Error logging prep:", error);
    return NextResponse.json({ error: "Failed to log prep" }, { status: 500 });
  }
}
