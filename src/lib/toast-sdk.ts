/**
 * Toast POS API Client
 * 
 * This is a placeholder SDK for Toast API integration.
 * Fill in your credentials in .env to enable real functionality.
 * 
 * Documentation: https://doc.toasttab.com/
 */

// ============================================
// CONFIGURATION (from environment variables)
// ============================================

const TOAST_CONFIG = {
  clientId: process.env.TOAST_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
  clientSecret: process.env.TOAST_CLIENT_SECRET || "PLACEHOLDER_CLIENT_SECRET",
  locationId: process.env.TOAST_LOCATION_ID || "PLACEHOLDER_LOCATION_ID",
  baseUrl: process.env.TOAST_API_BASE_URL || "https://api.toasttab.com",
  webhookSecret: process.env.TOAST_WEBHOOK_SECRET || "PLACEHOLDER_WEBHOOK_SECRET",
};

// ============================================
// TYPES
// ============================================

export interface ToastAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ToastMenuItem {
  guid: string;
  name: string;
  price: number;
  sku: string | null;
  plu: string | null;
}

export interface ToastMenuGroup {
  guid: string;
  name: string;
  items: ToastMenuItem[];
}

export interface ToastMenu {
  guid: string;
  name: string;
  groups: ToastMenuGroup[];
}

export interface ToastOrderItem {
  guid: string;
  menuItemGuid: string;
  quantity: number;
  displayName: string;
}

export interface ToastOrder {
  guid: string;
  entityType: string;
  externalId: string;
  openedDate: string;
  closedDate: string | null;
  checks: Array<{
    guid: string;
    selections: ToastOrderItem[];
  }>;
}

export interface ToastInventoryItem {
  guid: string;
  name: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface ToastWebhookPayload {
  eventType: string;
  eventTime: string;
  restaurantGuid: string;
  data: {
    orderGuid?: string;
    menuGuid?: string;
    [key: string]: unknown;
  };
}

// ============================================
// AUTH
// ============================================

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  // PLACEHOLDER: In production, this would make a real OAuth request
  console.log("[Toast SDK] Fetching access token (PLACEHOLDER)");
  
  if (TOAST_CONFIG.clientId === "PLACEHOLDER_CLIENT_ID") {
    console.warn("[Toast SDK] Using placeholder credentials. Set real credentials in .env");
    return "PLACEHOLDER_ACCESS_TOKEN";
  }

  try {
    const response = await fetch(`${TOAST_CONFIG.baseUrl}/authentication/v1/authentication/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: TOAST_CONFIG.clientId,
        clientSecret: TOAST_CONFIG.clientSecret,
        userAccessType: "TOAST_MACHINE_CLIENT",
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const data: ToastAuthResponse = await response.json();
    
    cachedToken = {
      token: data.accessToken,
      expiresAt: Date.now() + (data.expiresIn - 60) * 1000, // Refresh 1 min early
    };

    return data.accessToken;
  } catch (error) {
    console.error("[Toast SDK] Auth error:", error);
    throw error;
  }
}

// ============================================
// MENU API
// ============================================

export async function fetchMenus(): Promise<ToastMenu[]> {
  console.log("[Toast SDK] Fetching menus (PLACEHOLDER)");

  if (TOAST_CONFIG.clientId === "PLACEHOLDER_CLIENT_ID") {
    // Return mock data for development
    return [
      {
        guid: "mock-menu-1",
        name: "Dinner Menu",
        groups: [
          {
            guid: "mock-group-1",
            name: "Appetizers",
            items: [
              { guid: "mock-item-1", name: "Chips & Salsa", price: 5.99, sku: null, plu: null },
              { guid: "mock-item-2", name: "Guacamole", price: 8.99, sku: null, plu: null },
            ],
          },
          {
            guid: "mock-group-2",
            name: "Entrees",
            items: [
              { guid: "mock-item-3", name: "Chicken Tacos", price: 12.99, sku: null, plu: null },
              { guid: "mock-item-4", name: "Beef Burrito", price: 14.99, sku: null, plu: null },
            ],
          },
        ],
      },
    ];
  }

  const token = await getAccessToken();
  const response = await fetch(
    `${TOAST_CONFIG.baseUrl}/menus/v2/menus?restaurantGuid=${TOAST_CONFIG.locationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Toast-Restaurant-External-ID": TOAST_CONFIG.locationId,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch menus: ${response.status}`);
  }

  return response.json();
}

export async function fetchMenuItem(menuItemGuid: string): Promise<ToastMenuItem | null> {
  console.log(`[Toast SDK] Fetching menu item ${menuItemGuid} (PLACEHOLDER)`);

  if (TOAST_CONFIG.clientId === "PLACEHOLDER_CLIENT_ID") {
    return { guid: menuItemGuid, name: "Mock Item", price: 9.99, sku: null, plu: null };
  }

  const token = await getAccessToken();
  const response = await fetch(
    `${TOAST_CONFIG.baseUrl}/menus/v2/menuItems/${menuItemGuid}?restaurantGuid=${TOAST_CONFIG.locationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Toast-Restaurant-External-ID": TOAST_CONFIG.locationId,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch menu item: ${response.status}`);
  }

  return response.json();
}

// ============================================
// ORDERS API
// ============================================

export async function fetchOrder(orderGuid: string): Promise<ToastOrder | null> {
  console.log(`[Toast SDK] Fetching order ${orderGuid} (PLACEHOLDER)`);

  if (TOAST_CONFIG.clientId === "PLACEHOLDER_CLIENT_ID") {
    return {
      guid: orderGuid,
      entityType: "Order",
      externalId: "mock-order-123",
      openedDate: new Date().toISOString(),
      closedDate: null,
      checks: [
        {
          guid: "mock-check-1",
          selections: [
            { guid: "mock-sel-1", menuItemGuid: "mock-item-1", quantity: 2, displayName: "Chips & Salsa" },
          ],
        },
      ],
    };
  }

  const token = await getAccessToken();
  const response = await fetch(
    `${TOAST_CONFIG.baseUrl}/orders/v2/orders/${orderGuid}?restaurantGuid=${TOAST_CONFIG.locationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Toast-Restaurant-External-ID": TOAST_CONFIG.locationId,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch order: ${response.status}`);
  }

  return response.json();
}

// ============================================
// INVENTORY API (Write-back)
// ============================================

export async function updateInventoryCount(
  itemGuid: string,
  quantity: number,
  unitOfMeasure: string
): Promise<boolean> {
  console.log(`[Toast SDK] Updating inventory ${itemGuid} to ${quantity} ${unitOfMeasure} (PLACEHOLDER)`);

  if (TOAST_CONFIG.clientId === "PLACEHOLDER_CLIENT_ID") {
    console.log("[Toast SDK] Placeholder mode - inventory update simulated");
    return true;
  }

  const token = await getAccessToken();
  const response = await fetch(
    `${TOAST_CONFIG.baseUrl}/stock/v1/inventory`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Toast-Restaurant-External-ID": TOAST_CONFIG.locationId,
      },
      body: JSON.stringify({
        restaurantGuid: TOAST_CONFIG.locationId,
        inventoryItems: [
          {
            guid: itemGuid,
            quantity,
            unitOfMeasure,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    console.error(`[Toast SDK] Inventory update failed: ${response.status}`);
    return false;
  }

  return true;
}

// ============================================
// WEBHOOKS
// ============================================

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  console.log("[Toast SDK] Verifying webhook signature (PLACEHOLDER)");

  if (TOAST_CONFIG.webhookSecret === "PLACEHOLDER_WEBHOOK_SECRET") {
    console.warn("[Toast SDK] Placeholder mode - webhook signature not verified");
    return true; // Accept all webhooks in dev mode
  }

  // In production, implement HMAC-SHA256 verification
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', TOAST_CONFIG.webhookSecret)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;

  return true;
}

export function parseWebhookPayload(rawBody: string): ToastWebhookPayload {
  return JSON.parse(rawBody);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function isConfigured(): boolean {
  return TOAST_CONFIG.clientId !== "PLACEHOLDER_CLIENT_ID";
}

export function getConfig() {
  return {
    isConfigured: isConfigured(),
    locationId: TOAST_CONFIG.locationId,
    baseUrl: TOAST_CONFIG.baseUrl,
  };
}

// ============================================
// EXPORTS
// ============================================

const toastSdk = {
  // Auth
  getAccessToken,
  
  // Menu
  fetchMenus,
  fetchMenuItem,
  
  // Orders
  fetchOrder,
  
  // Inventory
  updateInventoryCount,
  
  // Webhooks
  verifyWebhookSignature,
  parseWebhookPayload,
  
  // Utils
  isConfigured,
  getConfig,
};

export default toastSdk;
