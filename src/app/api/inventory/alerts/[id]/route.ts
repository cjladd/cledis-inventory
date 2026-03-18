import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireApiAuth, isSession } from "@/lib/api-auth";

const UpdateAlertSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!isSession(auth)) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateAlertSchema.parse(body);

    const alert = await prisma.alert.findFirst({
      where: {
        id,
        inventoryItem: { locationId: auth.user.locationId },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: {
        status:           data.status,
        resolvedAt:       new Date(),
        resolvedByUserId: auth.user.id,
      },
    });

    return NextResponse.json({ success: true, alert: updatedAlert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating alert:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
