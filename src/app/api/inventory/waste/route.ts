import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

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
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  reason: WasteReasonEnum,
  note: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = WasteSchema.parse(body);

    // Verify item exists
    const item = await prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // TODO: Get userId from auth session
    let userId = data.userId;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id || "system";
    }

    // Create live adjustment
    const adjustment = await prisma.liveAdjustment.create({
      data: {
        type: "WASTE",
        quantity: data.quantity,
        unit: data.unit || item.unit,
        reason: data.reason,
        note: data.note,
        inventoryItemId: data.itemId,
        userId,
      },
      include: {
        inventoryItem: {
          select: { name: true, unit: true, safetyStock: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "WASTE",
        entityType: "LiveAdjustment",
        entityId: adjustment.id,
        details: {
          itemName: item.name,
          quantity: data.quantity,
          unit: data.unit || item.unit,
          reason: data.reason,
        },
        locationId: item.locationId,
        userId,
      },
    });

    // Check if we need to create an alert
    // Calculate current stock (simplified - in production use shared function)
    const adjustments = await prisma.liveAdjustment.findMany({
      where: { inventoryItemId: data.itemId },
    });

    const prepTotal = adjustments
      .filter((a) => a.type === "PREP")
      .reduce((sum, a) => sum + a.quantity, 0);
    const wasteTotal = adjustments
      .filter((a) => a.type === "WASTE")
      .reduce((sum, a) => sum + a.quantity, 0);

    const currentStock = item.parLevel + prepTotal - wasteTotal;

    // Create alert if below safety stock and no active alert exists
    if (currentStock <= item.safetyStock) {
      const existingAlert = await prisma.alert.findFirst({
        where: {
          inventoryItemId: data.itemId,
          status: "ACTIVE",
        },
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            inventoryItemId: data.itemId,
            status: "ACTIVE",
            predictedDepletionAt: new Date(Date.now() + 60 * 60 * 1000), // Placeholder: 1 hour
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      adjustment: {
        id: adjustment.id,
        type: adjustment.type,
        quantity: adjustment.quantity,
        unit: adjustment.unit,
        reason: adjustment.reason,
        itemName: adjustment.inventoryItem.name,
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
    return NextResponse.json(
      { error: "Failed to log waste" },
      { status: 500 }
    );
  }
}
