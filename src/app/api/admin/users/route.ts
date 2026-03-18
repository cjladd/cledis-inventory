import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireApiAuth, requireApiRole, isSession } from "@/lib/api-auth";

// ============================================================================
// GET /api/admin/users — list users for current location
// ============================================================================

export async function GET() {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const users = await prisma.user.findMany({
      where:   { locationId: auth.user.locationId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/admin/users — create a new user
// ============================================================================

const CreateUserSchema = z.object({
  name:  z.string().min(1),
  email: z.string().email(),
  pin:   z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
  role:  z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

export async function POST(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const body = await request.json();
    const data = CreateUserSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where:  { email: data.email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const pinHash = await bcrypt.hash(data.pin, 10);

    const user = await prisma.user.create({
      data: {
        name:       data.name,
        email:      data.email,
        pin:        pinHash,
        role:       data.role,
        locationId: auth.user.locationId,
      },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Admin users POST error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/admin/users — update a user (name, email, role, pin)
// ============================================================================

const UpdateUserSchema = z.object({
  id:    z.string().min(1),
  name:  z.string().min(1).optional(),
  email: z.string().email().optional(),
  role:  z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  pin:   z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits").optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const body = await request.json();
    const { id, pin, ...fields } = UpdateUserSchema.parse(body);

    const existing = await prisma.user.findFirst({
      where: { id, locationId: auth.user.locationId, isActive: true },
      select: { id: true, role: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent demoting the last admin
    if (fields.role && fields.role !== "ADMIN" && existing.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { locationId: auth.user.locationId, role: "ADMIN", isActive: true },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 400 });
      }
    }

    if (fields.email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: fields.email, NOT: { id } },
        select: { id: true },
      });
      if (emailTaken) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = { ...fields };
    if (pin) updateData.pin = await bcrypt.hash(pin, 10);

    const user = await prisma.user.update({
      where: { id },
      data:  updateData,
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Admin users PATCH error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/admin/users?id=xxx — soft-delete a user
// ============================================================================

export async function DELETE(request: Request) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!isSession(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing required query parameter: id" }, { status: 400 });
    }

    if (id === auth.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { id, locationId: auth.user.locationId, isActive: true },
      select: { id: true, role: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existing.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { locationId: auth.user.locationId, role: "ADMIN", isActive: true },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 });
      }
    }

    await prisma.user.update({
      where: { id },
      data:  { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin users DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
