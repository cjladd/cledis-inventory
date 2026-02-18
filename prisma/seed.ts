/**
 * Database Seed Script
 * 
 * Run with: npm run db:seed
 * 
 * This creates sample data for development/testing.
 * Modify the data below to match your restaurant's inventory.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create location
  const location = await prisma.location.upsert({
    where: { id: "loc-1" },
    update: {},
    create: {
      id: "loc-1",
      name: "Main Kitchen",
      toastLocationId: "PLACEHOLDER_TOAST_LOCATION", // Fill in when you have Toast access
      alertWindowMinutes: 90,
      writeBackEnabled: false,
    },
  });
  console.log("✓ Created location:", location.name);

  // Create users
  const adminPin = await bcrypt.hash("1234", 10);
  const staffPin = await bcrypt.hash("0000", 10);

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
  console.log("✓ Created admin user:", admin.name);

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
  console.log("✓ Created staff user:", staff.name);

  // Create inventory items
  // CUSTOMIZE THESE FOR YOUR RESTAURANT
  const inventoryItems = [
    { name: "Salsa", unit: "qt", parLevel: 20, safetyStock: 5, category: "Prep" },
    { name: "Guacamole", unit: "qt", parLevel: 15, safetyStock: 4, category: "Prep" },
    { name: "Pico de Gallo", unit: "qt", parLevel: 10, safetyStock: 3, category: "Prep" },
    { name: "Chicken (cooked)", unit: "lb", parLevel: 30, safetyStock: 8, category: "Protein" },
    { name: "Beef (cooked)", unit: "lb", parLevel: 25, safetyStock: 6, category: "Protein" },
    { name: "Carnitas", unit: "lb", parLevel: 20, safetyStock: 5, category: "Protein" },
    { name: "Rice", unit: "pan", parLevel: 8, safetyStock: 2, category: "Sides" },
    { name: "Black Beans", unit: "pan", parLevel: 6, safetyStock: 2, category: "Sides" },
    { name: "Pinto Beans", unit: "pan", parLevel: 6, safetyStock: 2, category: "Sides" },
    { name: "Tortillas (flour)", unit: "pack", parLevel: 20, safetyStock: 5, category: "Staples" },
    { name: "Tortillas (corn)", unit: "pack", parLevel: 15, safetyStock: 4, category: "Staples" },
    { name: "Cheese (shredded)", unit: "lb", parLevel: 15, safetyStock: 4, category: "Dairy" },
    { name: "Sour Cream", unit: "container", parLevel: 10, safetyStock: 3, category: "Dairy" },
    { name: "Lettuce (shredded)", unit: "lb", parLevel: 10, safetyStock: 3, category: "Produce" },
    { name: "Tomatoes (diced)", unit: "qt", parLevel: 8, safetyStock: 2, category: "Produce" },
    { name: "Onions (diced)", unit: "qt", parLevel: 6, safetyStock: 2, category: "Produce" },
    { name: "Jalapeños (sliced)", unit: "qt", parLevel: 4, safetyStock: 1, category: "Produce" },
    { name: "Lime Wedges", unit: "container", parLevel: 10, safetyStock: 3, category: "Produce" },
    { name: "Cilantro (chopped)", unit: "cup", parLevel: 8, safetyStock: 2, category: "Produce" },
    { name: "Chips", unit: "bag", parLevel: 20, safetyStock: 5, category: "Staples" },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: {
        locationId_name: {
          locationId: location.id,
          name: item.name,
        },
      },
      update: {},
      create: {
        ...item,
        locationId: location.id,
      },
    });
  }
  console.log(`✓ Created ${inventoryItems.length} inventory items`);

  // Create some menu items (placeholders - link to Toast when available)
  const menuItems = [
    { name: "Chicken Tacos", toastMenuItemId: "PLACEHOLDER_1" },
    { name: "Beef Burrito", toastMenuItemId: "PLACEHOLDER_2" },
    { name: "Carnitas Bowl", toastMenuItemId: "PLACEHOLDER_3" },
    { name: "Chips & Salsa", toastMenuItemId: "PLACEHOLDER_4" },
    { name: "Chips & Guacamole", toastMenuItemId: "PLACEHOLDER_5" },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: {
        locationId_toastMenuItemId: {
          locationId: location.id,
          toastMenuItemId: item.toastMenuItemId,
        },
      },
      update: {},
      create: {
        name: item.name,
        toastMenuItemId: item.toastMenuItemId,
        locationId: location.id,
      },
    });
  }
  console.log(`✓ Created ${menuItems.length} menu items`);

  // Create some sample recipes (menu item → inventory usage)
  // CUSTOMIZE THESE BASED ON YOUR ACTUAL RECIPES
  const chickenTacos = await prisma.menuItem.findFirst({
    where: { name: "Chicken Tacos", locationId: location.id },
  });
  const chicken = await prisma.inventoryItem.findFirst({
    where: { name: "Chicken (cooked)", locationId: location.id },
  });
  const cornTortillas = await prisma.inventoryItem.findFirst({
    where: { name: "Tortillas (corn)", locationId: location.id },
  });

  if (chickenTacos && chicken && cornTortillas) {
    await prisma.recipe.upsert({
      where: {
        menuItemId_inventoryItemId: {
          menuItemId: chickenTacos.id,
          inventoryItemId: chicken.id,
        },
      },
      update: {},
      create: {
        menuItemId: chickenTacos.id,
        inventoryItemId: chicken.id,
        quantityUsed: 0.25, // 4oz per order
        unit: "lb",
      },
    });
  }

  const chipsAndSalsa = await prisma.menuItem.findFirst({
    where: { name: "Chips & Salsa", locationId: location.id },
  });
  const salsa = await prisma.inventoryItem.findFirst({
    where: { name: "Salsa", locationId: location.id },
  });
  const chips = await prisma.inventoryItem.findFirst({
    where: { name: "Chips", locationId: location.id },
  });

  if (chipsAndSalsa && salsa && chips) {
    await prisma.recipe.upsert({
      where: {
        menuItemId_inventoryItemId: {
          menuItemId: chipsAndSalsa.id,
          inventoryItemId: salsa.id,
        },
      },
      update: {},
      create: {
        menuItemId: chipsAndSalsa.id,
        inventoryItemId: salsa.id,
        quantityUsed: 0.5, // 1/2 qt per order
        unit: "qt",
      },
    });
  }

  console.log("✓ Created sample recipes");

  console.log("\n✅ Database seeded successfully!");
  console.log("\nDefault login:");
  console.log("  Manager: admin@restaurant.com / PIN: 1234");
  console.log("  Staff: staff@restaurant.com / PIN: 0000");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
