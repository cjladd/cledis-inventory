import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireApiRole, isSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const menuItems = await prisma.menuItem.findMany({
      where:   { locationId: auth.user.locationId },
      orderBy: { name: "asc" },
      select: {
        id:              true,
        name:            true,
        toastMenuItemId: true,
        recipes: {
          select: {
            id:           true,
            quantityUsed: true,
            unit:         true,
            inventoryItem: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ menuItems });
  } catch (error) {
    console.error("Admin recipes GET error:", error);
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
  }
}

const CreateRecipeSchema = z.object({
  menuItemId:      z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantityUsed:    z.number().positive(),
  unit:            z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);
  if (!isSession(auth)) return auth;

  try {
    const body = await request.json();
    const data = CreateRecipeSchema.parse(body);

    const menuItem = await prisma.menuItem.findFirst({
      where: { id: data.menuItemId, locationId: auth.user.locationId },
      select: { id: true },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, locationId: auth.user.locationId },
      select: { id: true },
    });

    if (!inventoryItem) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const recipe = await prisma.recipe.upsert({
      where: {
        menuItemId_inventoryItemId: {
          menuItemId:      data.menuItemId,
          inventoryItemId: data.inventoryItemId,
        },
      },
      update: { quantityUsed: data.quantityUsed, unit: data.unit },
      create: {
        menuItemId:      data.menuItemId,
        inventoryItemId: data.inventoryItemId,
        quantityUsed:    data.quantityUsed,
        unit:            data.unit,
      },
      select: {
        id:           true,
        quantityUsed: true,
        unit:         true,
        menuItem:      { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, unit: true } },
      },
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.errors }, { status: 400 });
    }
    console.error("Admin recipes POST error:", error);
    return NextResponse.json({ error: "Failed to create recipe" }, { status: 500 });
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

    const existing = await prisma.recipe.findFirst({
      where: { id, menuItem: { locationId: auth.user.locationId } },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await prisma.recipe.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin recipes DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete recipe" }, { status: 500 });
  }
}
