import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import toastSdk, { ToastWebhookPayload } from "@/lib/toast-sdk";

/**
 * Toast Webhook Handler
 * 
 * This endpoint receives webhooks from Toast POS for:
 * - order_updated: When orders are created/updated/closed
 * - menu_updated: When menu items change
 * 
 * PLACEHOLDER: Webhook signature verification and processing
 * Fill in TOAST_WEBHOOK_SECRET in .env to enable signature verification
 */

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("Toast-Signature") || "";

    // Verify webhook signature
    if (!toastSdk.verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Toast Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    const payload: ToastWebhookPayload = toastSdk.parseWebhookPayload(rawBody);
    console.log(`[Toast Webhook] Received: ${payload.eventType}`);

    switch (payload.eventType) {
      case "ORDER_CREATED":
      case "ORDER_UPDATED":
      case "ORDER_CLOSED":
        await handleOrderEvent(payload);
        break;

      case "MENU_UPDATED":
        await handleMenuEvent(payload);
        break;

      default:
        console.log(`[Toast Webhook] Unhandled event type: ${payload.eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Toast Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle order events to decrement inventory
 */
async function handleOrderEvent(payload: ToastWebhookPayload) {
  const orderGuid = payload.data?.orderGuid;
  if (!orderGuid) {
    console.warn("[Toast Webhook] No orderGuid in payload");
    return;
  }

  // Check for duplicate processing (idempotency)
  const existingSale = await prisma.saleEvent.findFirst({
    where: { toastOrderId: orderGuid },
  });

  if (existingSale) {
    console.log(`[Toast Webhook] Order ${orderGuid} already processed`);
    return;
  }

  // Fetch full order details from Toast
  const order = await toastSdk.fetchOrder(orderGuid);
  if (!order) {
    console.warn(`[Toast Webhook] Could not fetch order ${orderGuid}`);
    return;
  }

  // Get location
  const location = await prisma.location.findFirst({
    where: { toastLocationId: payload.restaurantGuid },
  });

  if (!location) {
    console.warn(`[Toast Webhook] Unknown location: ${payload.restaurantGuid}`);
    return;
  }

  // Process each item in the order
  for (const check of order.checks || []) {
    for (const selection of check.selections || []) {
      // Find matching menu item
      const menuItem = await prisma.menuItem.findFirst({
        where: {
          locationId: location.id,
          toastMenuItemId: selection.menuItemGuid,
        },
      });

      if (!menuItem) {
        console.log(`[Toast Webhook] Unknown menu item: ${selection.menuItemGuid}`);
        continue;
      }

      // Create sale event
      await prisma.saleEvent.create({
        data: {
          toastOrderId: orderGuid,
          quantity: selection.quantity,
          locationId: location.id,
          menuItemId: menuItem.id,
        },
      });

      console.log(
        `[Toast Webhook] Recorded sale: ${selection.quantity}x ${menuItem.name}`
      );

      // Check recipes and trigger alerts if needed
      const recipes = await prisma.recipe.findMany({
        where: { menuItemId: menuItem.id },
        include: { inventoryItem: true },
      });

      for (const recipe of recipes) {
        // Calculate current stock and check if alert needed
        const item = recipe.inventoryItem;
        const adjustments = await prisma.liveAdjustment.findMany({
          where: { inventoryItemId: item.id },
        });

        const prepTotal = adjustments
          .filter((a) => a.type === "PREP")
          .reduce((sum, a) => sum + a.quantity, 0);
        const wasteTotal = adjustments
          .filter((a) => a.type === "WASTE")
          .reduce((sum, a) => sum + a.quantity, 0);

        const currentStock = item.parLevel + prepTotal - wasteTotal;

        if (currentStock <= item.safetyStock) {
          // Check if alert already exists
          const existingAlert = await prisma.alert.findFirst({
            where: {
              inventoryItemId: item.id,
              status: "ACTIVE",
            },
          });

          if (!existingAlert) {
            await prisma.alert.create({
              data: {
                inventoryItemId: item.id,
                status: "ACTIVE",
              },
            });
            console.log(`[Toast Webhook] Created alert for ${item.name}`);
          }
        }
      }
    }
  }
}

/**
 * Handle menu update events
 */
async function handleMenuEvent(payload: ToastWebhookPayload) {
  console.log("[Toast Webhook] Menu updated - sync required");
  // TODO: Implement menu sync logic
  // This would refresh local menu item cache from Toast
}

/**
 * Health check endpoint for webhook registration
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    configured: toastSdk.isConfigured(),
    message: "Toast webhook endpoint ready",
  });
}
