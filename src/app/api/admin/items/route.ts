import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireApiRole, isSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const items = await prisma.inventoryItem.findMany({
      where:   { locationId: auth.user.locationId },
      orderBy: { name: "asc" },
      select: {
        id:          true,
        name:        true,
        unit:        true,
        parLevel:    true,
        safetyStock: true,
        category:    true,
        isActive:    true,
        createdAt:   true,
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Admin items GET error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
  }
}

const CreateItemSchema = z.object({
  name:        z.string().min(1),
  unit:        z.string().min(1),
  parLevel:    z.number().positive(),
  safetyStock: z.number().nonnegative(),
  category:    z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const body = await request.json();
    const data = CreateItemSchema.parse(body);

    const item = await prisma.inventoryItem.create({
      data: {
        locationId:  auth.user.locationId,
        name:        data.name,
        unit:        data.unit,
        parLevel:    data.parLevel,
        safetyStock: data.safetyStock,
        category:    data.category,
      },
      select: {
        id:          true,
        name:        true,
        unit:        true,
        parLevel:    true,
        safetyStock: true,
        category:    true,
        isActive:    true,
        createdAt:   true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.errors }, { status: 400 });
    }
    console.error("Admin items POST error:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}

const UpdateItemSchema = z.object({
  id:          z.string().min(1),
  name:        z.string().min(1).optional(),
  unit:        z.string().min(1).optional(),
  parLevel:    z.number().positive().optional(),
  safetyStock: z.number().nonnegative().optional(),
  category:    z.string().min(1).optional(),
  isActive:    z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const body = await request.json();
    const { id, ...fields } = UpdateItemSchema.parse(body);

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, locationId: auth.user.locationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data:  fields,
      select: {
        id:          true,
        name:        true,
        unit:        true,
        parLevel:    true,
        safetyStock: true,
        category:    true,
        isActive:    true,
        createdAt:   true,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.errors }, { status: 400 });
    }
    console.error("Admin items PATCH error:", error);
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing required query parameter: id" }, { status: 400 });
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, locationId: auth.user.locationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    await prisma.inventoryItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin items DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
  }
}
