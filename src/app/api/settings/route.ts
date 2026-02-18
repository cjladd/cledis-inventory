import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const LOCATION_ID = "loc-1";

export async function GET() {
  try {
    const location = await prisma.location.findUnique({
      where: { id: LOCATION_ID },
      select: {
        id:                  true,
        name:                true,
        toastLocationId:     true,
        toastClientId:       true,
        writeBackEnabled:    true,
        alertWindowMinutes:  true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const isConfigured = Boolean(
      location.toastClientId &&
      !location.toastClientId.startsWith("PLACEHOLDER")
    );

    return NextResponse.json({ ...location, isConfigured });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

const SettingsSchema = z.object({
  writeBackEnabled:   z.boolean().optional(),
  alertWindowMinutes: z.number().min(15).max(480).optional(),
  toastClientId:      z.string().optional(),
  toastClientSecret:  z.string().optional(),
  toastLocationId:    z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = SettingsSchema.parse(body);

    const updated = await prisma.location.update({
      where: { id: LOCATION_ID },
      data: {
        ...(data.writeBackEnabled   !== undefined && { writeBackEnabled:   data.writeBackEnabled }),
        ...(data.alertWindowMinutes !== undefined && { alertWindowMinutes: data.alertWindowMinutes }),
        ...(data.toastClientId      !== undefined && { toastClientId:      data.toastClientId }),
        ...(data.toastClientSecret  !== undefined && { toastClientSecret:  data.toastClientSecret }),
        ...(data.toastLocationId    !== undefined && { toastLocationId:    data.toastLocationId }),
      },
    });

    return NextResponse.json({ success: true, location: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
