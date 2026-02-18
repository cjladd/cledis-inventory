import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AlertStatus } from '@prisma/client';

// Response types
interface AlertWithItem {
  id: string;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    category: string;
    parLevel: number;
    safetyStock: number;
  };
  status: AlertStatus;
  predictedDepletionAt: Date;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: {
    id: string;
    name: string;
  } | null;
  currentStock: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface AlertsResponse {
  alerts: AlertWithItem[];
  total: number;
  locationId: string;
}

/**
 * GET /api/inventory/alerts
 * Get active alerts for a location
 * 
 * Query params:
 * - locationId (required): Filter by location
 * - status (optional): Filter by status (ACTIVE, RESOLVED, DISMISSED). Default: ACTIVE
 * - urgency (optional): Filter by urgency (low, medium, high, critical)
 * - limit (optional): Number of alerts to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Required params
    const locationId = searchParams.get('locationId');
    if (!locationId) {
      return NextResponse.json(
        { error: 'locationId is required' },
        { status: 400 }
      );
    }

    // Optional params
    const statusParam = searchParams.get('status') as AlertStatus | null;
    const urgencyFilter = searchParams.get('urgency');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate status param
    const validStatuses: AlertStatus[] = ['ACTIVE', 'RESOLVED', 'DISMISSED'];
    const status: AlertStatus = statusParam && validStatuses.includes(statusParam) 
      ? statusParam 
      : 'ACTIVE';

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Fetch alerts with inventory items
    const alerts = await prisma.alert.findMany({
      where: {
        inventoryItem: {
          locationId,
        },
        status,
      },
      include: {
        inventoryItem: {
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
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { predictedDepletionAt: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Transform alerts with computed fields
    const alertsWithStock: AlertWithItem[] = alerts.map((alert) => {
      const item = alert.inventoryItem;

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

      const currentStock = Math.round(
        (prepTotal + manualTotal - wasteTotal - salesDeduction) * 100
      ) / 100;

      // Calculate urgency based on predicted depletion time
      const now = new Date();
      const hoursUntilDepletion = 
        (alert.predictedDepletionAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      let urgency: 'low' | 'medium' | 'high' | 'critical';
      if (hoursUntilDepletion <= 2 || currentStock <= 0) {
        urgency = 'critical';
      } else if (hoursUntilDepletion <= 6) {
        urgency = 'high';
      } else if (hoursUntilDepletion <= 12) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }

      return {
        id: alert.id,
        inventoryItem: {
          id: item.id,
          name: item.name,
          unit: item.unit,
          category: item.category,
          parLevel: item.parLevel,
          safetyStock: item.safetyStock,
        },
        status: alert.status,
        predictedDepletionAt: alert.predictedDepletionAt,
        createdAt: alert.createdAt,
        resolvedAt: alert.resolvedAt,
        resolvedBy: alert.resolvedBy,
        currentStock,
        urgency,
      };
    });

    // Apply urgency filter if specified
    let filteredAlerts = alertsWithStock;
    if (urgencyFilter) {
      filteredAlerts = alertsWithStock.filter((alert) => alert.urgency === urgencyFilter);
    }

    const response: AlertsResponse = {
      alerts: filteredAlerts,
      total: filteredAlerts.length,
      locationId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/alerts
 * Update alert status (resolve or dismiss)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, status, userId } = body;

    // Validate required fields
    if (!alertId || !status || !userId) {
      return NextResponse.json(
        { error: 'alertId, status, and userId are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: AlertStatus[] = ['RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'status must be RESOLVED or DISMISSED' },
        { status: 400 }
      );
    }

    // Verify alert exists and is active
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        inventoryItem: true,
      },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    if (alert.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Alert is not active' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update alert and create audit log
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id: alertId },
        data: {
          status,
          resolvedAt: new Date(),
          resolvedByUserId: userId,
        },
      }),
      prisma.auditLog.create({
        data: {
          locationId: user.locationId,
          userId,
          action: status === 'RESOLVED' ? 'ALERT_RESOLVED' : 'ALERT_DISMISSED',
          entityType: 'Alert',
          entityId: alertId,
          details: {
            itemName: alert.inventoryItem.name,
            previousStatus: alert.status,
            newStatus: status,
          },
        },
      }),
    ]);

    return NextResponse.json({
      id: updatedAlert.id,
      status: updatedAlert.status,
      resolvedAt: updatedAlert.resolvedAt,
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}
