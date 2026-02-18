import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const LOCATION_ID = "loc-1";

// ============================================================================
// GET /api/admin/users
// List all users for the demo location. The pin hash is never returned.
// ============================================================================

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where:   { locationId: LOCATION_ID },
      orderBy: { name: "asc" },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        createdAt: true,
        // pin is intentionally omitted
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
