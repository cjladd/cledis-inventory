import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import toastSdk, { ToastWebhookPayload } from "@/lib/toast-sdk";
import { calculateCurrentStock } from "@/lib/inventory";
import { createAlertIfNeeded } from "@/lib/forecast";

/**
 * Toast Webhook Handler
 *
 * Receives webhooks from Toast POS for order_updated / menu_updated events.
 * Fill in TOAST_WEBHOOK_SECRET in .env to enable signature verification.
 */

export async function POST(request: Request) {
  try {
    const rawBody  = await request.text();
    const signature = request.headers.get("Toast-Signature") ?? "";

    if (!toastSdk.verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Toast Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

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

async function handleOrderEvent(payload: ToastWebhookPayload) {
  const orderGuid = payload.data?.orderGuid;
  if (!orderGuid) {
    console.warn("[Toast Webhook] No orderGuid in payload");
    return;
  }

  // Idempotency check
  const existingSale = await prisma.saleEvent.findFirst({
    where: { toastOrderId: orderGuid },
  });

  if (existingSale) {
    console.log(`[Toast Webhook] Order ${orderGuid} already processed`);
    return;
  }

  const order = await toastSdk.fetchOrder(orderGuid);
  if (!order) {
    console.warn(`[Toast Webhook] Could not fetch order ${orderGuid}`);
    return;
  }

  const location = await prisma.location.findFirst({
    where: { toastLocationId: payload.restaurantGuid },
  });

  if (!location) {
    console.warn(`[Toast Webhook] Unknown location: ${payload.restaurantGuid}`);
    return;
  }

  for (const check of order.checks ?? []) {
    for (const selection of check.selections ?? []) {
      const menuItem = await prisma.menuItem.findFirst({
        where: {
          locationId:      location.id,
          toastMenuItemId: selection.menuItemGuid,
        },
      });

      if (!menuItem) {
        console.log(`[Toast Webhook] Unknown menu item: ${selection.menuItemGuid}`);
        continue;
      }

      await prisma.saleEvent.create({
        data: {
          toastOrderId: orderGuid,
          quantity:     selection.quantity,
          locationId:   location.id,
          menuItemId:   menuItem.id,
        },
      });

      console.log(`[Toast Webhook] Recorded sale: ${selection.quantity}x ${menuItem.name}`);

      // Check alerts using the shared accurate calculation
      const recipes = await prisma.recipe.findMany({
        where:   { menuItemId: menuItem.id },
        include: { inventoryItem: true },
      });

      for (const recipe of recipes) {
        const { currentStock } = await calculateCurrentStock(recipe.inventoryItem.id);
        await createAlertIfNeeded(
          recipe.inventoryItem.id,
          currentStock,
          recipe.inventoryItem.safetyStock
        );
      }
    }
  }
}

async function handleMenuEvent(_payload: ToastWebhookPayload) {
  console.log("[Toast Webhook] Menu updated — sync required");
}

/** Health check endpoint for webhook registration */
export async function GET() {
  return NextResponse.json({
    status:     "ok",
    configured: toastSdk.isConfigured(),
    message:    "Toast webhook endpoint ready",
  });
}
