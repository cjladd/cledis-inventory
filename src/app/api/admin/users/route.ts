import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiRole, isSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const users = await prisma.user.findMany({
      where:   { locationId: auth.user.locationId },
      orderBy: { name: "asc" },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        createdAt: true,
        // pin intentionally omitted
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
