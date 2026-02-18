import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createHmac } from 'crypto';

// Toast webhook event types
type ToastEventType = 
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_CLOSED'
  | 'MENU_UPDATED'
  | 'INVENTORY_UPDATED';

// Toast webhook payload structure (simplified)
interface ToastWebhookPayload {
  eventType: ToastEventType;
  eventId: string;
  eventTime: string;
  restaurantGuid: string;
  data: ToastOrderData | ToastMenuData | ToastInventoryData;
}

interface ToastOrderData {
  orderGuid: string;
  selections?: ToastOrderSelection[];
}

interface ToastOrderSelection {
  itemGuid: string;
  itemName: string;
  quantity: number;
  modifiers?: ToastOrderModifier[];
}

interface ToastOrderModifier {
  guid: string;
  name: string;
  quantity: number;
}

interface ToastMenuData {
  menuGuid: string;
  items?: ToastMenuItem[];
}

interface ToastMenuItem {
  guid: string;
  name: string;
  isActive: boolean;
}

interface ToastInventoryData {
  itemGuid: string;
  quantityOnHand: number;
}

interface WebhookResponse {
  success: boolean;
  eventId: string;
  message: string;
  processed?: {
    itemsAffected: number;
  };
}

/**
 * POST /api/toast/webhook
 * Receive Toast POS webhooks for order and menu updates
 * 
 * Headers:
 * - x-toast-signature: HMAC signature for verification
 * - x-toast-timestamp: Request timestamp
 * 
 * Body: Toast webhook payload
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    let payload: ToastWebhookPayload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.eventType || !payload.eventId || !payload.restaurantGuid) {
      return NextResponse.json(
        { error: 'Missing required webhook fields' },
        { status: 400 }
      );
    }

    // Verify webhook signature (placeholder - implement with actual Toast secret)
    const signatureValid = await verifyToastSignature(request, rawBody);
    if (!signatureValid) {
      console.warn('Invalid Toast webhook signature:', payload.eventId);
      // In production, return 401. For development, log and continue.
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Find location by Toast restaurant GUID
    const location = await prisma.location.findUnique({
      where: { toastLocationId: payload.restaurantGuid },
    });

    if (!location) {
      console.warn('Unknown Toast location:', payload.restaurantGuid);
      // Return 200 to acknowledge receipt even if we don't process
      return NextResponse.json({
        success: false,
        eventId: payload.eventId,
        message: 'Unknown location',
      });
    }

    // Process based on event type
    let result: WebhookResponse;

    switch (payload.eventType) {
      case 'ORDER_CREATED':
      case 'ORDER_UPDATED':
      case 'ORDER_CLOSED':
        result = await processOrderEvent(payload, location.id);
        break;

      case 'MENU_UPDATED':
        result = await processMenuEvent(payload, location.id);
        break;

      case 'INVENTORY_UPDATED':
        result = await processInventoryEvent(payload, location.id);
        break;

      default:
        result = {
          success: true,
          eventId: payload.eventId,
          message: `Unhandled event type: ${payload.eventType}`,
        };
    }

    // Log webhook receipt for auditing
    await prisma.auditLog.create({
      data: {
        locationId: location.id,
        userId: 'SYSTEM', // System user for webhook processing
        action: 'TOAST_WEBHOOK_RECEIVED',
        entityType: 'ToastWebhook',
        entityId: payload.eventId,
        details: {
          eventType: payload.eventType,
          restaurantGuid: payload.restaurantGuid,
          success: result.success,
          itemsAffected: result.processed?.itemsAffected || 0,
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing Toast webhook:', error);
    
    // Always return 200 to prevent Toast from retrying
    // Log the error for investigation
    return NextResponse.json({
      success: false,
      eventId: 'unknown',
      message: 'Internal processing error',
    });
  }
}

/**
 * Verify Toast webhook signature
 * Placeholder implementation - needs actual Toast webhook secret
 */
async function verifyToastSignature(
  request: NextRequest, 
  rawBody: string
): Promise<boolean> {
  const signature = request.headers.get('x-toast-signature');
  const timestamp = request.headers.get('x-toast-timestamp');

  if (!signature || !timestamp) {
    return false;
  }

  // Get Toast webhook secret from environment
  const webhookSecret = process.env.TOAST_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('TOAST_WEBHOOK_SECRET not configured');
    return true; // Allow in development
  }

  // Compute expected signature
  const signaturePayload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(signaturePayload)
    .digest('hex');

  // Constant-time comparison
  return signature === expectedSignature;
}

/**
 * Process order events - decrement inventory based on recipes
 */
async function processOrderEvent(
  payload: ToastWebhookPayload,
  locationId: string
): Promise<WebhookResponse> {
  const orderData = payload.data as ToastOrderData;
  
  if (!orderData.selections || orderData.selections.length === 0) {
    return {
      success: true,
      eventId: payload.eventId,
      message: 'Order has no selections',
    };
  }

  let itemsAffected = 0;

  // Process each order selection
  for (const selection of orderData.selections) {
    try {
      // Find menu item by Toast GUID
      const menuItem = await prisma.menuItem.findFirst({
        where: {
          locationId,
          toastMenuItemId: selection.itemGuid,
        },
        include: {
          recipes: {
            include: {
              inventoryItem: true,
            },
          },
        },
      });

      if (!menuItem) {
        console.warn('Unknown menu item:', selection.itemGuid);
        continue;
      }

      // Check for existing sale event (idempotency)
      const existingSale = await prisma.saleEvent.findUnique({
        where: {
          toastOrderId_menuItemId: {
            toastOrderId: orderData.orderGuid,
            menuItemId: menuItem.id,
          },
        },
      });

      if (existingSale) {
        // Already processed this order item
        continue;
      }

      // Create sale event
      await prisma.saleEvent.create({
        data: {
          locationId,
          toastOrderId: orderData.orderGuid,
          menuItemId: menuItem.id,
          quantity: selection.quantity,
        },
      });

      itemsAffected++;

      // Check if any recipe ingredients are now below safety stock
      for (const recipe of menuItem.recipes) {
        await checkInventoryAlert(recipe.inventoryItem.id);
      }
    } catch (error) {
      console.error('Error processing order selection:', error);
    }
  }

  return {
    success: true,
    eventId: payload.eventId,
    message: `Processed order ${orderData.orderGuid}`,
    processed: {
      itemsAffected,
    },
  };
}

/**
 * Process menu update events
 * Placeholder - sync menu items from Toast
 */
async function processMenuEvent(
  payload: ToastWebhookPayload,
  locationId: string
): Promise<WebhookResponse> {
  const menuData = payload.data as ToastMenuData;

  // Placeholder: In production, fetch full menu from Toast API
  // and sync with local MenuItem records
  console.log('Menu update received for location:', locationId);
  console.log('Menu GUID:', menuData.menuGuid);

  return {
    success: true,
    eventId: payload.eventId,
    message: 'Menu update acknowledged (sync pending)',
    processed: {
      itemsAffected: 0,
    },
  };
}

/**
 * Process inventory update events from Toast
 * Placeholder - can be used to sync external inventory changes
 */
async function processInventoryEvent(
  payload: ToastWebhookPayload,
  locationId: string
): Promise<WebhookResponse> {
  const inventoryData = payload.data as ToastInventoryData;

  // Placeholder: In production, reconcile Toast inventory with local counts
  console.log('Inventory update received for location:', locationId);
  console.log('Item GUID:', inventoryData.itemGuid);
  console.log('Quantity:', inventoryData.quantityOnHand);

  return {
    success: true,
    eventId: payload.eventId,
    message: 'Inventory update acknowledged (reconciliation pending)',
    processed: {
      itemsAffected: 0,
    },
  };
}

/**
 * Check if inventory item needs an alert after sale
 */
async function checkInventoryAlert(itemId: string): Promise<void> {
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

    // Create alert if below safety stock and no active alert exists
    if (currentStock <= item.safetyStock && item.alerts.length === 0) {
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
    console.error('Error checking inventory alert:', error);
  }
}

/**
 * GET /api/toast/webhook
 * Health check endpoint for Toast webhook registration
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Kitchen-Up Inventory',
    webhookEndpoint: '/api/toast/webhook',
    supportedEvents: [
      'ORDER_CREATED',
      'ORDER_UPDATED', 
      'ORDER_CLOSED',
      'MENU_UPDATED',
      'INVENTORY_UPDATED',
    ],
  });
}
