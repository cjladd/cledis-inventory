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

  const order = await toastSdk.fetchOrder(orderGuid);
  if (!order) {
    console.warn(`[Toast Webhook] Could not fetch order ${orderGuid}`);
    return;
  }

  const location = await prisma.location.findFirst({
    where:  { toastLocationId: payload.restaurantGuid },
    select: { id: true },
  });

  if (!location) {
    console.warn(`[Toast Webhook] Unknown location: ${payload.restaurantGuid}`);
    return;
  }

  // Toast sends ORDER_CREATED, then ORDER_UPDATED and ORDER_CLOSED for the same
  // order, and each payload carries the full order. So we total the order as it
  // now stands and upsert to that total: re-running an event is a no-op, and
  // items added after creation are still picked up. (The previous code returned
  // early if any row existed for the order, so nothing after the first event
  // was ever recorded.)
  const quantityByGuid = new Map<string, number>();
  for (const check of order.checks ?? []) {
    for (const selection of check.selections ?? []) {
      // One order can list the same item on several lines; summing them first
      // also avoids colliding on the (toastOrderId, menuItemId) unique index.
      quantityByGuid.set(
        selection.menuItemGuid,
        (quantityByGuid.get(selection.menuItemGuid) ?? 0) + selection.quantity
      );
    }
  }

  if (quantityByGuid.size === 0) return;

  const menuItems = await prisma.menuItem.findMany({
    where: {
      locationId:      location.id,
      toastMenuItemId: { in: [...quantityByGuid.keys()] },
    },
    select: {
      id:              true,
      name:            true,
      toastMenuItemId: true,
      recipes: { select: { inventoryItemId: true } },
    },
  });

  const known = new Set(menuItems.map((m) => m.toastMenuItemId));
  for (const guid of quantityByGuid.keys()) {
    if (!known.has(guid)) console.log(`[Toast Webhook] Unknown menu item: ${guid}`);
  }

  if (menuItems.length === 0) return;

  await prisma.$transaction(
    menuItems.map((menuItem) => {
      const quantity = quantityByGuid.get(menuItem.toastMenuItemId) ?? 0;
      return prisma.saleEvent.upsert({
        where: {
          toastOrderId_menuItemId: {
            toastOrderId: orderGuid,
            menuItemId:   menuItem.id,
          },
        },
        update: { quantity },
        create: {
          toastOrderId: orderGuid,
          quantity,
          locationId:   location.id,
          menuItemId:   menuItem.id,
        },
      });
    })
  );

  console.log(
    `[Toast Webhook] Order ${orderGuid}: recorded ${menuItems.length} line item(s)`
  );

  // One alert check per affected inventory item, not one per order line.
  const affected = new Set<string>();
  for (const menuItem of menuItems) {
    for (const recipe of menuItem.recipes) affected.add(recipe.inventoryItemId);
  }

  for (const inventoryItemId of affected) {
    const item = await prisma.inventoryItem.findUnique({
      where:  { id: inventoryItemId },
      select: { safetyStock: true },
    });
    if (!item) continue;

    const { currentStock } = await calculateCurrentStock(inventoryItemId);
    await createAlertIfNeeded(inventoryItemId, currentStock, item.safetyStock);
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
