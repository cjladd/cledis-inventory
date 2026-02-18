/**
 * Database Seed Script — Demo-ready data
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ──────────────────────────────────────────
  // LOCATION
  // ──────────────────────────────────────────
  const location = await prisma.location.upsert({
    where: { id: "loc-1" },
    update: {},
    create: {
      id: "loc-1",
      name: "Main Kitchen",
      toastLocationId: "PLACEHOLDER_TOAST_LOCATION",
      alertWindowMinutes: 90,
      writeBackEnabled: false,
    },
  });
  console.log("✓ Location:", location.name);

  // ──────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────
  const [adminPin, staffPin] = await Promise.all([
    bcrypt.hash("1234", 10),
    bcrypt.hash("0000", 10),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: "admin@restaurant.com" },
    update: {},
    create: {
      email: "admin@restaurant.com",
      name: "Kitchen Manager",
      pin: adminPin,
      role: "MANAGER",
      locationId: location.id,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@restaurant.com" },
    update: {},
    create: {
      email: "staff@restaurant.com",
      name: "Line Cook",
      pin: staffPin,
      role: "STAFF",
      locationId: location.id,
    },
  });
  console.log("✓ Users:", admin.name, "+", staff.name);

  // ──────────────────────────────────────────
  // INVENTORY ITEMS
  // ──────────────────────────────────────────
  const itemDefs = [
    { name: "Salsa",              unit: "qt",        parLevel: 20, safetyStock: 5,  category: "Prep"     },
    { name: "Guacamole",          unit: "qt",        parLevel: 15, safetyStock: 4,  category: "Prep"     },
    { name: "Pico de Gallo",      unit: "qt",        parLevel: 10, safetyStock: 3,  category: "Prep"     },
    { name: "Chicken (cooked)",   unit: "lb",        parLevel: 30, safetyStock: 8,  category: "Protein"  },
    { name: "Beef (cooked)",      unit: "lb",        parLevel: 25, safetyStock: 6,  category: "Protein"  },
    { name: "Carnitas",           unit: "lb",        parLevel: 20, safetyStock: 5,  category: "Protein"  },
    { name: "Rice",               unit: "pan",       parLevel: 8,  safetyStock: 2,  category: "Sides"    },
    { name: "Black Beans",        unit: "pan",       parLevel: 6,  safetyStock: 2,  category: "Sides"    },
    { name: "Pinto Beans",        unit: "pan",       parLevel: 6,  safetyStock: 2,  category: "Sides"    },
    { name: "Tortillas (flour)",  unit: "pack",      parLevel: 20, safetyStock: 5,  category: "Staples"  },
    { name: "Tortillas (corn)",   unit: "pack",      parLevel: 15, safetyStock: 4,  category: "Staples"  },
    { name: "Cheese (shredded)",  unit: "lb",        parLevel: 15, safetyStock: 4,  category: "Dairy"    },
    { name: "Sour Cream",         unit: "container", parLevel: 10, safetyStock: 3,  category: "Dairy"    },
    { name: "Lettuce (shredded)", unit: "lb",        parLevel: 10, safetyStock: 3,  category: "Produce"  },
    { name: "Tomatoes (diced)",   unit: "qt",        parLevel: 8,  safetyStock: 2,  category: "Produce"  },
    { name: "Onions (diced)",     unit: "qt",        parLevel: 6,  safetyStock: 2,  category: "Produce"  },
    { name: "Jalapeños (sliced)", unit: "qt",        parLevel: 4,  safetyStock: 1,  category: "Produce"  },
    { name: "Lime Wedges",        unit: "container", parLevel: 10, safetyStock: 3,  category: "Produce"  },
    { name: "Cilantro (chopped)", unit: "cup",       parLevel: 8,  safetyStock: 2,  category: "Produce"  },
    { name: "Chips",              unit: "bag",       parLevel: 20, safetyStock: 5,  category: "Staples"  },
  ];

  for (const item of itemDefs) {
    await prisma.inventoryItem.upsert({
      where: { locationId_name: { locationId: location.id, name: item.name } },
      update: {},
      create: { ...item, locationId: location.id },
    });
  }
  console.log(`✓ ${itemDefs.length} inventory items`);

  // ──────────────────────────────────────────
  // MENU ITEMS
  // ──────────────────────────────────────────
  const menuItemDefs = [
    { name: "Chicken Tacos",      toastMenuItemId: "PLACEHOLDER_1" },
    { name: "Beef Burrito",       toastMenuItemId: "PLACEHOLDER_2" },
    { name: "Carnitas Bowl",      toastMenuItemId: "PLACEHOLDER_3" },
    { name: "Chips & Salsa",      toastMenuItemId: "PLACEHOLDER_4" },
    { name: "Chips & Guacamole",  toastMenuItemId: "PLACEHOLDER_5" },
  ];

  for (const mi of menuItemDefs) {
    await prisma.menuItem.upsert({
      where: { locationId_toastMenuItemId: { locationId: location.id, toastMenuItemId: mi.toastMenuItemId } },
      update: {},
      create: { ...mi, locationId: location.id },
    });
  }
  console.log(`✓ ${menuItemDefs.length} menu items`);

  // ──────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────
  const getItem = (name: string) =>
    prisma.inventoryItem.findFirstOrThrow({ where: { name, locationId: location.id } });
  const getMenuItem = (name: string) =>
    prisma.menuItem.findFirstOrThrow({ where: { name, locationId: location.id } });

  // ──────────────────────────────────────────
  // RECIPES (complete mappings for all 5 menu items)
  // ──────────────────────────────────────────
  const recipeDefs: { menuItem: string; ingredients: { item: string; qty: number; unit: string }[] }[] = [
    {
      menuItem: "Chicken Tacos",
      ingredients: [
        { item: "Chicken (cooked)",   qty: 0.25, unit: "lb"   },
        { item: "Tortillas (corn)",   qty: 0.17, unit: "pack" }, // ~2 tortillas
        { item: "Pico de Gallo",      qty: 0.06, unit: "qt"   },
        { item: "Cheese (shredded)",  qty: 0.08, unit: "lb"   },
        { item: "Lime Wedges",        qty: 0.1,  unit: "container" },
      ],
    },
    {
      menuItem: "Beef Burrito",
      ingredients: [
        { item: "Beef (cooked)",      qty: 0.3,  unit: "lb"   },
        { item: "Tortillas (flour)",  qty: 0.05, unit: "pack" },
        { item: "Rice",               qty: 0.13, unit: "pan"  },
        { item: "Black Beans",        qty: 0.17, unit: "pan"  },
        { item: "Cheese (shredded)",  qty: 0.1,  unit: "lb"   },
        { item: "Sour Cream",         qty: 0.1,  unit: "container" },
      ],
    },
    {
      menuItem: "Carnitas Bowl",
      ingredients: [
        { item: "Carnitas",           qty: 0.3,  unit: "lb"   },
        { item: "Rice",               qty: 0.13, unit: "pan"  },
        { item: "Black Beans",        qty: 0.17, unit: "pan"  },
        { item: "Lettuce (shredded)", qty: 0.1,  unit: "lb"   },
        { item: "Cheese (shredded)",  qty: 0.1,  unit: "lb"   },
        { item: "Salsa",              qty: 0.06, unit: "qt"   },
        { item: "Sour Cream",         qty: 0.1,  unit: "container" },
      ],
    },
    {
      menuItem: "Chips & Salsa",
      ingredients: [
        { item: "Chips",              qty: 0.5,  unit: "bag"  },
        { item: "Salsa",              qty: 0.5,  unit: "qt"   },
      ],
    },
    {
      menuItem: "Chips & Guacamole",
      ingredients: [
        { item: "Chips",              qty: 0.5,  unit: "bag"  },
        { item: "Guacamole",          qty: 0.25, unit: "qt"   },
      ],
    },
  ];

  let recipeCount = 0;
  for (const r of recipeDefs) {
    const menuItem = await getMenuItem(r.menuItem);
    for (const ing of r.ingredients) {
      const invItem = await getItem(ing.item);
      await prisma.recipe.upsert({
        where: { menuItemId_inventoryItemId: { menuItemId: menuItem.id, inventoryItemId: invItem.id } },
        update: {},
        create: { menuItemId: menuItem.id, inventoryItemId: invItem.id, quantityUsed: ing.qty, unit: ing.unit },
      });
      recipeCount++;
    }
  }
  console.log(`✓ ${recipeCount} recipe ingredient mappings`);

  // ──────────────────────────────────────────
  // LIVE ADJUSTMENTS — create varied stock levels
  //
  // Formula: currentStock = parLevel + prepTotal - wasteTotal + manualTotal - salesDepletion
  // We set adjustments so:
  //   ~8 items OK   (stock well above par)
  //   ~7 items Low  (stock 40-50% of par)
  //   ~3 items Critical (stock <= safetyStock)
  //   ~2 items Out  (stock = 0)
  // ──────────────────────────────────────────

  // Wipe existing adjustments so re-seeding is idempotent
  await prisma.liveAdjustment.deleteMany({ where: { inventoryItem: { locationId: location.id } } });

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

  // Helper: create adjustment record
  const adj = async (
    itemName: string,
    type: "PREP" | "WASTE" | "MANUAL",
    quantity: number,
    userId: string,
    createdAt: Date,
    reason?: string,
    note?: string
  ) => {
    const item = await getItem(itemName);
    return prisma.liveAdjustment.create({
      data: {
        inventoryItemId: item.id,
        userId,
        type,
        quantity,
        unit: item.unit,
        reason,
        note,
        createdAt,
      },
    });
  };

  // ── OK items (big preps, moderate waste) ──────────────
  // Salsa: parLevel=20, safetyStock=5 → target ~18 (OK)
  await adj("Salsa", "PREP",  12, admin.id, hoursAgo(20), undefined, "Morning batch");
  await adj("Salsa", "PREP",   8, staff.id, hoursAgo(8),  undefined, "Lunch refill");
  await adj("Salsa", "WASTE",  2, staff.id, hoursAgo(5),  "EXPIRED", "End of yesterday");
  // net: 20 + 12 + 8 - 2 = 38 → OK

  // Pico de Gallo: parLevel=10 → target ~9 (OK)
  await adj("Pico de Gallo", "PREP",  5, admin.id, hoursAgo(18), undefined, "Fresh batch");
  await adj("Pico de Gallo", "WASTE", 1, staff.id, hoursAgo(2),  "SPOILED", "Slight spoilage");
  // net: 10 + 5 - 1 = 14 → OK

  // Rice: parLevel=8 → target ~7 (OK)
  await adj("Rice", "PREP",  4, admin.id, hoursAgo(10), undefined, "AM cook");
  await adj("Rice", "PREP",  3, staff.id, hoursAgo(4),  undefined, "Lunch rush prep");
  await adj("Rice", "WASTE", 1, staff.id, hoursAgo(1),  "OVERCOOKED", "Burnt batch");
  // net: 8 + 4 + 3 - 1 = 14 → OK

  // Pinto Beans: parLevel=6 → target ~5 (OK)
  await adj("Pinto Beans", "PREP",  3, admin.id, hoursAgo(12), undefined, "Morning cook");
  // net: 6 + 3 = 9 → OK

  // Tomatoes: parLevel=8 → target ~7 (OK)
  await adj("Tomatoes (diced)", "PREP",  5, staff.id, hoursAgo(15), undefined, "Fresh dice");
  await adj("Tomatoes (diced)", "WASTE", 1, staff.id, hoursAgo(3),  "EXPIRED", "Old batch out");
  // net: 8 + 5 - 1 = 12 → OK

  // Onions: parLevel=6 → target ~5 (OK)
  await adj("Onions (diced)", "PREP",  3, admin.id, hoursAgo(14), undefined, "Prep station");
  // net: 6 + 3 = 9 → OK

  // Lime Wedges: parLevel=10 → target ~8 (OK)
  await adj("Lime Wedges", "PREP",  6, staff.id, hoursAgo(9), undefined, "Cut fresh");
  await adj("Lime Wedges", "WASTE", 1, staff.id, hoursAgo(2), "EXPIRED", "Dried out");
  // net: 10 + 6 - 1 = 15 → OK

  // Cilantro: parLevel=8 → target ~7 (OK)
  await adj("Cilantro (chopped)", "PREP",  3, admin.id, hoursAgo(6), undefined, "Fresh chop");
  // net: 8 + 3 = 11 → OK

  // ── LOW items (40-50% of par) ─────────────────────────
  // Chicken: parLevel=30, safetyStock=8 → target ~13 (low = ≤15)
  await adj("Chicken (cooked)", "PREP",   8, admin.id, hoursAgo(22), undefined, "Overnight cook");
  await adj("Chicken (cooked)", "WASTE",  5, staff.id, hoursAgo(6),  "SPOILED", "Sat overnight");
  await adj("Chicken (cooked)", "WASTE",  5, staff.id, hoursAgo(1),  "OVER_PREP", "Too much yesterday");
  // net: 30 + 8 - 5 - 5 = 28 → still OK without sales; will be low with sales depletion
  // Add manual reduction to simulate low stock
  await adj("Chicken (cooked)", "WASTE",  15, staff.id, hoursAgo(3), "DROPPED", "Dropped full insert");
  // net: 30 + 8 - 5 - 5 - 15 = 13 → LOW ✓

  // Beef: parLevel=25, safetyStock=6 → target ~11 (low)
  await adj("Beef (cooked)", "PREP",  6, admin.id, hoursAgo(20), undefined, "Morning cook");
  await adj("Beef (cooked)", "WASTE", 4, staff.id, hoursAgo(4),  "OVERCOOKED", "Overcooked batch");
  await adj("Beef (cooked)", "WASTE", 16, staff.id, hoursAgo(2), "EXPIRED", "Previous day surplus");
  // net: 25 + 6 - 4 - 16 = 11 → LOW ✓

  // Tortillas flour: parLevel=20, safetyStock=5 → target ~9 (low)
  await adj("Tortillas (flour)", "WASTE", 12, staff.id, hoursAgo(3), "EXPIRED", "Pack left open");
  // net: 20 - 12 = 8 → LOW ✓

  // Tortillas corn: parLevel=15, safetyStock=4 → target ~7 (low)
  await adj("Tortillas (corn)", "WASTE", 9, staff.id, hoursAgo(5), "EXPIRED", "Forgot to refrigerate");
  // net: 15 - 9 = 6 → LOW ✓

  // Black Beans: parLevel=6, safetyStock=2 → target ~3 (low = ≤3)
  await adj("Black Beans", "WASTE", 3, staff.id, hoursAgo(2), "OVERCOOKED", "Batch scorched");
  // net: 6 - 3 = 3 → LOW ✓

  // Chips: parLevel=20, safetyStock=5 → target ~9 (low)
  await adj("Chips", "WASTE", 12, staff.id, hoursAgo(6), "DROPPED", "Rack tipped over");
  // net: 20 - 12 = 8 → LOW ✓

  // Jalapeños: parLevel=4, safetyStock=1 → target ~2 (low)
  await adj("Jalapeños (sliced)", "WASTE", 2, staff.id, hoursAgo(3), "EXPIRED", "Too old");
  // net: 4 - 2 = 2 → LOW ✓

  // ── CRITICAL items (≤ safetyStock) ────────────────────
  // Guacamole: parLevel=15, safetyStock=4 → target ~3 (critical)
  await adj("Guacamole", "WASTE", 13, staff.id, hoursAgo(4), "SPOILED", "Oxidized batch");
  // net: 15 - 13 = 2 → CRITICAL ✓

  // Cheese: parLevel=15, safetyStock=4 → target ~3 (critical)
  await adj("Cheese (shredded)", "WASTE", 13, admin.id, hoursAgo(5), "EXPIRED", "Past use-by");
  // net: 15 - 13 = 2 → CRITICAL ✓

  // Sour Cream: parLevel=10, safetyStock=3 → target ~2 (critical)
  await adj("Sour Cream", "WASTE", 9, staff.id, hoursAgo(3), "EXPIRED", "Container unsealed");
  // net: 10 - 9 = 1 → CRITICAL ✓

  // ── OUT items (stock = 0) ─────────────────────────────
  // Carnitas: parLevel=20, safetyStock=5 → target 0 (out)
  await adj("Carnitas", "WASTE", 20, staff.id, hoursAgo(2), "SPOILED", "Entire batch off");
  // net: 20 - 20 = 0 → OUT ✓

  // Lettuce: parLevel=10, safetyStock=3 → target 0 (out)
  await adj("Lettuce (shredded)", "WASTE", 11, admin.id, hoursAgo(1), "EXPIRED", "Delivery was bad");
  // net: Math.max(0, 10 - 11) = 0 → OUT ✓

  console.log("✓ Live adjustments for varied stock levels");

  // ──────────────────────────────────────────
  // SALE EVENTS (simulate Toast POS sales)
  // ──────────────────────────────────────────
  await prisma.saleEvent.deleteMany({ where: { location: { id: location.id } } });

  const chickenTacos  = await getMenuItem("Chicken Tacos");
  const beefBurrito   = await getMenuItem("Beef Burrito");
  const carnitasBowl  = await getMenuItem("Carnitas Bowl");
  const chipsAndSalsa = await getMenuItem("Chips & Salsa");
  const chipsAndGuac  = await getMenuItem("Chips & Guacamole");

  const salesData = [
    { menuItem: chickenTacos,  quantity: 8,  toastOrderId: "ORDER-001", hoursBack: 6  },
    { menuItem: beefBurrito,   quantity: 5,  toastOrderId: "ORDER-002", hoursBack: 5  },
    { menuItem: chipsAndSalsa, quantity: 12, toastOrderId: "ORDER-003", hoursBack: 4  },
    { menuItem: chickenTacos,  quantity: 6,  toastOrderId: "ORDER-004", hoursBack: 3  },
    { menuItem: carnitasBowl,  quantity: 4,  toastOrderId: "ORDER-005", hoursBack: 3  },
    { menuItem: chipsAndGuac,  quantity: 7,  toastOrderId: "ORDER-006", hoursBack: 2  },
    { menuItem: beefBurrito,   quantity: 4,  toastOrderId: "ORDER-007", hoursBack: 2  },
    { menuItem: chipsAndSalsa, quantity: 9,  toastOrderId: "ORDER-008", hoursBack: 1  },
  ];

  for (const sale of salesData) {
    await prisma.saleEvent.create({
      data: {
        toastOrderId: sale.toastOrderId,
        quantity: sale.quantity,
        locationId: location.id,
        menuItemId: sale.menuItem.id,
        createdAt: hoursAgo(sale.hoursBack),
      },
    });
  }
  console.log(`✓ ${salesData.length} sale events`);

  // ──────────────────────────────────────────
  // ALERTS (3 active + 1 resolved)
  // ──────────────────────────────────────────
  await prisma.alert.deleteMany({ where: { inventoryItem: { locationId: location.id } } });

  const guacItem     = await getItem("Guacamole");
  const cheeseItem   = await getItem("Cheese (shredded)");
  const sourCreamItem = await getItem("Sour Cream");
  const carnitasItem = await getItem("Carnitas");

  await prisma.alert.create({
    data: {
      inventoryItemId: guacItem.id,
      status: "ACTIVE",
      predictedDepletionAt: new Date(now.getTime() + 30 * 60_000), // 30 min
      createdAt: hoursAgo(2),
    },
  });

  await prisma.alert.create({
    data: {
      inventoryItemId: cheeseItem.id,
      status: "ACTIVE",
      predictedDepletionAt: new Date(now.getTime() + 45 * 60_000), // 45 min
      createdAt: hoursAgo(3),
    },
  });

  await prisma.alert.create({
    data: {
      inventoryItemId: sourCreamItem.id,
      status: "ACTIVE",
      predictedDepletionAt: new Date(now.getTime() + 15 * 60_000), // 15 min
      createdAt: hoursAgo(1),
    },
  });

  // Resolved alert
  await prisma.alert.create({
    data: {
      inventoryItemId: carnitasItem.id,
      status: "RESOLVED",
      predictedDepletionAt: new Date(now.getTime() - 60 * 60_000),
      resolvedAt: hoursAgo(1),
      resolvedByUserId: admin.id,
      createdAt: hoursAgo(3),
    },
  });

  console.log("✓ 3 active + 1 resolved alerts");

  // ──────────────────────────────────────────
  // AUDIT LOG (10-15 entries)
  // ──────────────────────────────────────────
  await prisma.auditLog.deleteMany({ where: { locationId: location.id } });

  const auditEntries = [
    { action: "PREP",  entityType: "LiveAdjustment", details: { itemName: "Salsa",              quantity: 12, unit: "qt"   }, hoursBack: 20, userId: admin.id },
    { action: "PREP",  entityType: "LiveAdjustment", details: { itemName: "Rice",               quantity: 4,  unit: "pan"  }, hoursBack: 10, userId: admin.id },
    { action: "WASTE", entityType: "LiveAdjustment", details: { itemName: "Chicken (cooked)",   quantity: 15, unit: "lb",  reason: "DROPPED"    }, hoursBack: 3, userId: staff.id },
    { action: "WASTE", entityType: "LiveAdjustment", details: { itemName: "Guacamole",          quantity: 13, unit: "qt",  reason: "SPOILED"    }, hoursBack: 4, userId: staff.id },
    { action: "WASTE", entityType: "LiveAdjustment", details: { itemName: "Cheese (shredded)",  quantity: 13, unit: "lb",  reason: "EXPIRED"    }, hoursBack: 5, userId: admin.id },
    { action: "PREP",  entityType: "LiveAdjustment", details: { itemName: "Pico de Gallo",      quantity: 5,  unit: "qt"   }, hoursBack: 18, userId: admin.id },
    { action: "WASTE", entityType: "LiveAdjustment", details: { itemName: "Carnitas",           quantity: 20, unit: "lb",  reason: "SPOILED"    }, hoursBack: 2, userId: staff.id },
    { action: "WASTE", entityType: "LiveAdjustment", details: { itemName: "Lettuce (shredded)", quantity: 11, unit: "lb",  reason: "EXPIRED"    }, hoursBack: 1, userId: admin.id },
    { action: "PREP",  entityType: "LiveAdjustment", details: { itemName: "Salsa",              quantity: 8,  unit: "qt"   }, hoursBack: 8,  userId: staff.id },
    { action: "PREP",  entityType: "LiveAdjustment", details: { itemName: "Cilantro (chopped)", quantity: 3,  unit: "cup"  }, hoursBack: 6,  userId: admin.id },
    { action: "WASTE", entityType: "LiveAdjustment", details: { itemName: "Sour Cream",         quantity: 9,  unit: "container", reason: "EXPIRED" }, hoursBack: 3, userId: staff.id },
    { action: "PREP",  entityType: "LiveAdjustment", details: { itemName: "Rice",               quantity: 3,  unit: "pan"  }, hoursBack: 4,  userId: staff.id },
    { action: "PREP",  entityType: "LiveAdjustment", details: { itemName: "Lime Wedges",        quantity: 6,  unit: "container" }, hoursBack: 9, userId: staff.id },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId:   "seed-" + Math.random().toString(36).slice(2, 8),
        details:    entry.details,
        locationId: location.id,
        userId:     entry.userId,
        createdAt:  hoursAgo(entry.hoursBack),
      },
    });
  }
  console.log(`✓ ${auditEntries.length} audit log entries`);

  console.log("\n✅ Database seeded successfully!");
  console.log("\nDefault logins:");
  console.log("  Manager: admin@restaurant.com / PIN: 1234");
  console.log("  Staff:   staff@restaurant.com / PIN: 0000");
  console.log("\nExpected stock levels:");
  console.log("  OK       (~8): Salsa, Pico de Gallo, Rice, Pinto Beans, Tomatoes, Onions, Lime Wedges, Cilantro");
  console.log("  Low      (~7): Chicken, Beef, Tortillas (flour/corn), Black Beans, Chips, Jalapeños");
  console.log("  Critical (~3): Guacamole, Cheese, Sour Cream");
  console.log("  Out      (~2): Carnitas, Lettuce");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
