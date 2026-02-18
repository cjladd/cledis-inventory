import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Predefined waste reasons
const WASTE_REASONS = [
  'EXPIRED',
  'SPOILED',
  'OVERCOOKED',
  'DROPPED',
  'CONTAMINATED',
  'CUSTOMER_RETURN',
  'QUALITY_ISSUE',
  'OTHER',
] as const;

// Request validation schema
const WasteLogSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  quantity: z.number().positive('quantity must be positive'),
  reason: z.enum(WASTE_REASONS, {
    errorMap: () => ({ message: `reason must be one of: ${WASTE_REASONS.join(', ')}` }),
  }),
  note: z.string().optional(),
  userId: z.string().min(1, 'userId is required'),
});

type WasteLogRequest = z.infer<typeof WasteLogSchema>;

interface WasteLogResponse {
  id: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  note: string | null;
  createdAt: Date;
}

/**
 * POST /api/inventory/waste
 * Log a live waste adjustment
 * 
 * Body:
 * - itemId (required): Inventory item ID
 * - quantity (required): Amount wasted (positive number, will be deducted)
 * - reason (required): Waste reason code
 * - note (optional): Additional notes
 * - userId (required): User logging the waste
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validationResult = WasteLogSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { itemId, quantity, reason, note, userId }: WasteLogRequest = validationResult.data;

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

    // Create the waste adjustment and audit log in a transaction
    const [adjustment] = await prisma.$transaction([
      // Create live adjustment (waste is stored as positive, deducted in calculations)
      prisma.liveAdjustment.create({
        data: {
          inventoryItemId: itemId,
          userId,
          type: 'WASTE',
          quantity,
          unit: inventoryItem.unit,
          reason,
          note: note || null,
        },
      }),
      // Create audit log
      prisma.auditLog.create({
        data: {
          locationId: user.locationId,
          userId,
          action: 'WASTE_LOGGED',
          entityType: 'InventoryItem',
          entityId: itemId,
          details: {
            quantity,
            unit: inventoryItem.unit,
            reason,
            note: note || null,
            itemName: inventoryItem.name,
          },
        },
      }),
    ]);

    // Check if this waste triggers a low stock alert
    await checkAndCreateAlert(inventoryItem.id, user.locationId);

    const response: WasteLogResponse = {
      id: adjustment.id,
      inventoryItemId: adjustment.inventoryItemId,
      itemName: inventoryItem.name,
      quantity: adjustment.quantity,
      unit: adjustment.unit,
      reason: adjustment.reason!,
      note: adjustment.note,
      createdAt: adjustment.createdAt,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error logging waste:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to log waste' },
      { status: 500 }
    );
  }
}

/**
 * Check current stock and create alert if below safety threshold
 */
async function checkAndCreateAlert(itemId: string, locationId: string): Promise<void> {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        liveAdjustments: {
          select: {
            type: true,
            quantity: true,
          },
        },
        recipes: {
          include: {
            menuItem: {
              include: {
                saleEvents: {
                  select: {
                    quantity: true,
                  },
                },
              },
            },
          },
        },
        alerts: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!item) return;

    // Calculate current stock
    const prepTotal = item.liveAdjustments
      .filter((adj) => adj.type === 'PREP')
      .reduce((sum, adj) => sum + adj.quantity, 0);

    const wasteTotal = item.liveAdjustments
      .filter((adj) => adj.type === 'WASTE')
      .reduce((sum, adj) => sum + adj.quantity, 0);

    const manualTotal = item.liveAdjustments
      .filter((adj) => adj.type === 'MANUAL')
      .reduce((sum, adj) => sum + adj.quantity, 0);

    const salesDeduction = item.recipes.reduce((total, recipe) => {
      const menuItemSales = recipe.menuItem.saleEvents.reduce(
        (sum, sale) => sum + sale.quantity,
        0
      );
      return total + menuItemSales * recipe.quantityUsed;
    }, 0);

    const currentStock = prepTotal + manualTotal - wasteTotal - salesDeduction;

    // Create alert if stock is critical and no active alert exists
    if (currentStock <= item.safetyStock && item.alerts.length === 0) {
      // Simple prediction: assume depletion in 24 hours if critical
      const predictedDepletionAt = new Date();
      predictedDepletionAt.setHours(predictedDepletionAt.getHours() + 24);

      await prisma.alert.create({
        data: {
          inventoryItemId: itemId,
          status: 'ACTIVE',
          predictedDepletionAt,
        },
      });
    }
  } catch (error) {
    // Log but don't throw - alert creation is secondary to waste logging
    console.error('Error checking/creating alert:', error);
  }
}
