import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdateAlertSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateAlertSchema.parse(body);

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const firstUser = await prisma.user.findFirst();
    const userId = firstUser?.id;

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: {
        status:          data.status,
        resolvedAt:      new Date(),
        resolvedByUserId: userId,
      },
    });

    return NextResponse.json({
      success: true,
      alert:   updatedAlert,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
