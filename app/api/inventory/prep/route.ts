import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Request validation schema
const PrepLogSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  quantity: z.number().positive('quantity must be positive'),
  note: z.string().optional(),
  userId: z.string().min(1, 'userId is required'),
});

type PrepLogRequest = z.infer<typeof PrepLogSchema>;

interface PrepLogResponse {
  id: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  note: string | null;
  createdAt: Date;
}

/**
 * POST /api/inventory/prep
 * Log a live prep adjustment
 * 
 * Body:
 * - itemId (required): Inventory item ID
 * - quantity (required): Amount prepped (positive number)
 * - note (optional): Additional notes
 * - userId (required): User performing the prep
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validationResult = PrepLogSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { itemId, quantity, note, userId }: PrepLogRequest = validationResult.data;

    // Verify user exists and get their location
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, locationId: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify inventory item exists and belongs to user's location
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        locationId: user.locationId,
        isActive: true,
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found or not accessible' },
        { status: 404 }
      );
    }

    // Create the prep adjustment and audit log in a transaction
    const [adjustment] = await prisma.$transaction([
      // Create live adjustment
      prisma.liveAdjustment.create({
        data: {
          inventoryItemId: itemId,
          userId,
          type: 'PREP',
          quantity,
          unit: inventoryItem.unit,
          note: note || null,
        },
      }),
      // Create audit log
      prisma.auditLog.create({
        data: {
          locationId: user.locationId,
          userId,
          action: 'PREP_LOGGED',
          entityType: 'InventoryItem',
          entityId: itemId,
          details: {
            quantity,
            unit: inventoryItem.unit,
            note: note || null,
            itemName: inventoryItem.name,
          },
        },
      }),
    ]);

    const response: PrepLogResponse = {
      id: adjustment.id,
      inventoryItemId: adjustment.inventoryItemId,
      itemName: inventoryItem.name,
      quantity: adjustment.quantity,
      unit: adjustment.unit,
      note: adjustment.note,
      createdAt: adjustment.createdAt,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error logging prep:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to log prep' },
      { status: 500 }
    );
  }
}
