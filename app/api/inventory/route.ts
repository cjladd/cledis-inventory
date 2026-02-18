import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Types for computed inventory response
interface InventoryItemWithStock {
  id: string;
  name: string;
  unit: string;
  category: string;
  parLevel: number;
  safetyStock: number;
  isActive: boolean;
  toastItemId: string | null;
  currentStock: number;
  status: 'in-stock' | 'low' | 'critical' | 'out';
  lastAdjustment: Date | null;
}

interface InventoryListResponse {
  items: InventoryItemWithStock[];
  total: number;
  locationId: string;
}

/**
 * GET /api/inventory
 * List inventory items with computed currentStock
 * 
 * Query params:
 * - locationId (required): Filter by location
 * - category (optional): Filter by category
 * - status (optional): Filter by stock status (in-stock, low, critical, out)
 * - search (optional): Search by item name
 * - page (optional): Pagination page number (default: 1)
 * - limit (optional): Items per page (default: 50)
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
    const category = searchParams.get('category');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

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

    // Build where clause
    const where: Prisma.InventoryItemWhereInput = {
      locationId,
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Fetch inventory items with aggregated adjustments and sales
    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        liveAdjustments: {
          select: {
            type: true,
            quantity: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
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
      orderBy: {
        name: 'asc',
      },
    });

    // Compute current stock for each item
    const itemsWithStock: InventoryItemWithStock[] = inventoryItems.map((item) => {
      // Calculate prep additions (positive)
      const prepTotal = item.liveAdjustments
        .filter((adj) => adj.type === 'PREP')
        .reduce((sum, adj) => sum + adj.quantity, 0);

      // Calculate waste deductions (negative)
      const wasteTotal = item.liveAdjustments
        .filter((adj) => adj.type === 'WASTE')
        .reduce((sum, adj) => sum + adj.quantity, 0);

      // Calculate manual adjustments (can be positive or negative)
      const manualTotal = item.liveAdjustments
        .filter((adj) => adj.type === 'MANUAL')
        .reduce((sum, adj) => sum + adj.quantity, 0);

      // Calculate sales deductions from recipes
      const salesDeduction = item.recipes.reduce((total, recipe) => {
        const menuItemSales = recipe.menuItem.saleEvents.reduce(
          (sum, sale) => sum + sale.quantity,
          0
        );
        return total + menuItemSales * recipe.quantityUsed;
      }, 0);

      // Current stock = prep + manual - waste - sales
      const currentStock = prepTotal + manualTotal - wasteTotal - salesDeduction;

      // Determine stock status
      let status: 'in-stock' | 'low' | 'critical' | 'out';
      if (currentStock <= 0) {
        status = 'out';
      } else if (currentStock <= item.safetyStock) {
        status = 'critical';
      } else if (currentStock <= item.parLevel) {
        status = 'low';
      } else {
        status = 'in-stock';
      }

      // Get last adjustment date
      const lastAdjustment = item.liveAdjustments[0]?.createdAt ?? null;

      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        category: item.category,
        parLevel: item.parLevel,
        safetyStock: item.safetyStock,
        isActive: item.isActive,
        toastItemId: item.toastItemId,
        currentStock: Math.round(currentStock * 100) / 100, // Round to 2 decimal places
        status,
        lastAdjustment,
      };
    });

    // Apply status filter if specified
    let filteredItems = itemsWithStock;
    if (statusFilter) {
      filteredItems = itemsWithStock.filter((item) => item.status === statusFilter);
    }

    // Apply pagination
    const total = filteredItems.length;
    const skip = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(skip, skip + limit);

    const response: InventoryListResponse = {
      items: paginatedItems,
      total,
      locationId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
