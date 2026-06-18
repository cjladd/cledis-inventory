/**
 * Database Seed Script — Cledis Restaurant (Kitchen-Up Inventory)
 * Run: npm run db:seed
 *
 * PLACEHOLDER VALUES — update when available:
 *   toastLocationId  → real Toast location IDs from Toast dashboard
 *   toastMenuItemId  → real Toast menu item IDs from Toast menu setup
 *   Recipe quantities for "case"/"batch" items → update once case sizes known
 *
 * Par levels: Elm Hill ×1 | Bellevue ×2 | Gulch ×3
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const LOCATIONS = [
  { id: "loc-elm", name: "Elm Hill", toastLocationId: "PLACEHOLDER_TOAST_ELM", multiplier: 1 },
  { id: "loc-bel", name: "Bellevue", toastLocationId: "PLACEHOLDER_TOAST_BEL", multiplier: 2 },
  { id: "loc-gul", name: "Gulch",    toastLocationId: "PLACEHOLDER_TOAST_GUL", multiplier: 3 },
] as const;

// ── Inventory definitions (par/safety at ×1 = Elm Hill) ─────────────────────
// NOTE: "case" unit quantities in recipes are set to 0.01 (placeholder).
// Update once real case sizes are confirmed with your supplier.
// Proteins are tracked in lb for recipe granularity even when ordered by case.
const INVENTORY_DEFS = [
  // Proteins (lb)
  { name: "Ground Beef 80/20",           unit: "lb",    par: 30, safety: 8,  category: "Protein"   },
  { name: "Chicken Breast, Sliced",      unit: "lb",    par: 20, safety: 5,  category: "Protein"   },
  { name: "Bacon",                       unit: "lb",    par: 10, safety: 3,  category: "Protein"   },
  { name: "Bologna, Thick-Cut",          unit: "lb",    par: 5,  safety: 2,  category: "Protein"   },
  { name: "Pork Tenderloin",             unit: "lb",    par: 5,  safety: 2,  category: "Protein"   },
  { name: "Pepperoni",                   unit: "lb",    par: 3,  safety: 1,  category: "Protein"   },
  { name: "Party Wings",                 unit: "lb",    par: 20, safety: 5,  category: "Protein"   },
  { name: "Eggs",                        unit: "case",  par: 2,  safety: 1,  category: "Protein"   },
  // Dairy / Cheese (case — update sizes with supplier)
  { name: "American Cheese",             unit: "case",  par: 5,  safety: 2,  category: "Dairy"     },
  { name: "White American Cheese",       unit: "case",  par: 3,  safety: 1,  category: "Dairy"     },
  { name: "Pepper Jack Cheese",          unit: "case",  par: 3,  safety: 1,  category: "Dairy"     },
  { name: "Cheddar Cheese",              unit: "case",  par: 3,  safety: 1,  category: "Dairy"     },
  { name: "Cream Cheese",                unit: "case",  par: 2,  safety: 1,  category: "Dairy"     },
  { name: "Bleu Cheese",                 unit: "case",  par: 2,  safety: 1,  category: "Dairy"     },
  { name: "Mozzarella, Shredded",        unit: "case",  par: 3,  safety: 1,  category: "Dairy"     },
  { name: "Parmesan Cheese",             unit: "case",  par: 2,  safety: 1,  category: "Dairy"     },
  { name: "Pimento Cheese",              unit: "batch", par: 2,  safety: 1,  category: "Dairy"     },
  { name: "Goat Cheese Crema",           unit: "batch", par: 1,  safety: 1,  category: "Dairy"     },
  { name: "Mascarpone",                  unit: "case",  par: 1,  safety: 1,  category: "Dairy"     },
  { name: "Mayo",                        unit: "case",  par: 3,  safety: 1,  category: "Dairy"     },
  { name: "Ketchup",                     unit: "case",  par: 2,  safety: 1,  category: "Dairy"     },
  { name: "Buttermilk",                  unit: "case",  par: 1,  safety: 1,  category: "Dairy"     },
  // Produce (case)
  { name: "Lettuce, Romaine",            unit: "case",  par: 3,  safety: 1,  category: "Produce"   },
  { name: "Tomatoes",                    unit: "case",  par: 3,  safety: 1,  category: "Produce"   },
  { name: "Onions",                      unit: "case",  par: 3,  safety: 1,  category: "Produce"   },
  { name: "Jalapeños",                   unit: "case",  par: 2,  safety: 1,  category: "Produce"   },
  { name: "Mushrooms",                   unit: "case",  par: 2,  safety: 1,  category: "Produce"   },
  { name: "Green Tomatoes",              unit: "case",  par: 1,  safety: 1,  category: "Produce"   },
  { name: "Pickles",                     unit: "case",  par: 2,  safety: 1,  category: "Produce"   },
  // Bread / Buns (case)
  { name: "Regular Buns",                unit: "case",  par: 5,  safety: 2,  category: "Bread"     },
  { name: "Sesame Seed Buns",            unit: "case",  par: 2,  safety: 1,  category: "Bread"     },
  { name: "Gluten-Free Buns",            unit: "case",  par: 1,  safety: 1,  category: "Bread"     },
  { name: "Flour Tortillas",             unit: "case",  par: 2,  safety: 1,  category: "Bread"     },
  { name: "Potato Buns",                 unit: "case",  par: 1,  safety: 1,  category: "Bread"     },
  // Frozen / Fried (case)
  { name: "French Fries",                unit: "case",  par: 5,  safety: 2,  category: "Frozen"    },
  { name: "Onion Rings",                 unit: "case",  par: 3,  safety: 1,  category: "Frozen"    },
  { name: "Hash Browns",                 unit: "case",  par: 2,  safety: 1,  category: "Frozen"    },
  { name: "Breaded Pickle Fries",        unit: "case",  par: 2,  safety: 1,  category: "Frozen"    },
  { name: "Breaded Pickles",             unit: "case",  par: 2,  safety: 1,  category: "Frozen"    },
  { name: "Mozzarella Sticks",           unit: "case",  par: 3,  safety: 1,  category: "Frozen"    },
  // Dry Goods (case)
  { name: "Doritos",                     unit: "case",  par: 2,  safety: 1,  category: "Dry Goods" },
  { name: "Potato Chips, Bagged",        unit: "case",  par: 3,  safety: 1,  category: "Dry Goods" },
  { name: "Croutons",                    unit: "case",  par: 1,  safety: 1,  category: "Dry Goods" },
  { name: "Lemon Pepper Seasoning",      unit: "case",  par: 1,  safety: 1,  category: "Dry Goods" },
  { name: "Old Bay Seasoning",           unit: "case",  par: 1,  safety: 1,  category: "Dry Goods" },
  // House Sauces — finished batches tracked by the batch.
  // Staff logs PREP when a new batch is made; sales deduct via recipes below.
  // Raw ingredients (Mayo, Buttermilk) are tracked above and depleted manually
  // when making a batch. Sauce recipes (what goes IN each sauce) to be added
  // once ingredient quantities are confirmed.
  { name: "Cledis Sauce",                unit: "batch", par: 5,  safety: 2,  category: "Sauces"    },
  { name: "Boom Boom Sauce",             unit: "batch", par: 3,  safety: 1,  category: "Sauces"    },
  { name: "Bandito Sauce",               unit: "batch", par: 3,  safety: 1,  category: "Sauces"    },
  { name: "Alabama White Sauce",         unit: "batch", par: 3,  safety: 1,  category: "Sauces"    },
  { name: "Raspberry Chipotle Sauce",    unit: "batch", par: 3,  safety: 1,  category: "Sauces"    },
  { name: "Maple Bourbon BBQ Sauce",     unit: "batch", par: 3,  safety: 1,  category: "Sauces"    },
  { name: "Ranch",                       unit: "batch", par: 3,  safety: 1,  category: "Sauces"    },
  { name: "Thai Peanut Butter Sauce",    unit: "batch", par: 2,  safety: 1,  category: "Sauces"    },
  { name: "Basil Pesto",                 unit: "case",  par: 2,  safety: 1,  category: "Sauces"    },
  { name: "Marinara Sauce",              unit: "case",  par: 2,  safety: 1,  category: "Sauces"    },
  { name: "White Queso",                 unit: "case",  par: 3,  safety: 1,  category: "Sauces"    },
  // Wing "Toss 'Em" flavors that aren't already house sauces above. Buffalo is
  // bought bottled (from the box); Jalapeño Aioli is house-made (batch).
  { name: "Buffalo Sauce",               unit: "case",  par: 2,  safety: 1,  category: "Sauces"    },
  { name: "Jalapeño Aioli",              unit: "batch", par: 2,  safety: 1,  category: "Sauces"    },
  // Specialty / Preserves (case)
  { name: "Peach Preserves",             unit: "case",  par: 1,  safety: 1,  category: "Specialty" },
  { name: "Strawberry Jalapeño Jam",     unit: "case",  par: 2,  safety: 1,  category: "Specialty" },
  { name: "Raspberry Preserves",         unit: "case",  par: 1,  safety: 1,  category: "Specialty" },
  { name: "Smoked Blackberry Preserves", unit: "case",  par: 1,  safety: 1,  category: "Specialty" },
  { name: "Five-Pepper Jam",             unit: "case",  par: 1,  safety: 1,  category: "Specialty" },
  { name: "Ghost Pepper Jam",            unit: "case",  par: 1,  safety: 1,  category: "Specialty" },
  { name: "Balsamic Drizzle",            unit: "case",  par: 1,  safety: 1,  category: "Specialty" },
  { name: "Truffle Oil",                 unit: "case",  par: 1,  safety: 1,  category: "Specialty" },
];

// ── Menu item names — identical at all three locations ───────────────────────
const MENU_ITEM_NAMES = [
  // Signature Burgers
  "Cledis Burger", "Oklahoma Smash", "Morning Deets", "Skippy Thai Yay",
  "Tioga Ranch", "Georgia Caprese", "Bandito Smash", "Shroom Boom",
  "Italian Stallion", "Bleus Brother", "Billy Berry Smash", "Cousin Eddie",
  "Ghost Rider", "Big Smack", "Blackberry Smoke",
  // Sandwiches
  "Hoosier Daddy", "Fried Bologna", "Larry Bird", "Raspberry Beret",
  "Cheeseburger Tacos", "Peachy King", "Balboa Jones", "Bleu Berry Melt",
  // Shareables + Salads
  "Dorito Bag Nachos", "Mozzarella Sticks", "Cheeseburger Salad",
  "Garbage Pail Fries", "Pickle Fries", "Chicken BLT Salad",
  // Sides
  "French Fries", "Truffle Shuffle Fries", "Cheese Fries",
  "Bacon Ranch Fries", "Onion Rings", "Bagged Chips",
  // Wings (each size is a separate Toast line item)
  "Wings (8)", "Wings (25)", "Wings (50)", "Wings (75)", "Wings (100)",
  // Kids
  "Kid's Burger", "Kid's Chicken Melt", "Kid's Grilled Cheese",
  // Beverages
  "Fountain Drink",
];

// ── Recipe definitions ───────────────────────────────────────────────────────
// PLACEHOLDER QUANTITIES:
//   lb items  → actual approximate lb per serving (e.g. 0.25 lb = one ¼-lb patty)
//   case/batch → 0.01 (1/100th of a case/batch per serving) — UPDATE when real
//                case sizes and batch yields are confirmed with supplier
type IngredientDef = { item: string; qty: number };
type RecipeDef = { menuItem: string; ingredients: IngredientDef[] };

const RECIPES: RecipeDef[] = [
  // ── Signature Burgers ─────────────────────────────────────────────────────
  { menuItem: "Cledis Burger", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "American Cheese", qty: 0.01 },   { item: "Lettuce, Romaine", qty: 0.01 },
    { item: "Tomatoes", qty: 0.01 },          { item: "Onions", qty: 0.01 },
    { item: "Pickles", qty: 0.01 },           { item: "Cledis Sauce", qty: 0.01 },
  ]},
  { menuItem: "Oklahoma Smash", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "American Cheese", qty: 0.01 },   { item: "Onions", qty: 0.01 },
    { item: "Pickles", qty: 0.01 },           { item: "Cledis Sauce", qty: 0.01 },
  ]},
  { menuItem: "Morning Deets", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "American Cheese", qty: 0.01 },   { item: "Bacon", qty: 0.1 },
    { item: "Hash Browns", qty: 0.01 },       { item: "Eggs", qty: 0.01 },
    { item: "Mayo", qty: 0.01 },              { item: "Ketchup", qty: 0.01 },
  ]},
  { menuItem: "Skippy Thai Yay", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 },     { item: "Regular Buns", qty: 0.01 },
    { item: "Pepper Jack Cheese", qty: 0.01 },    { item: "Bacon", qty: 0.1 },
    { item: "Thai Peanut Butter Sauce", qty: 0.01 }, { item: "Strawberry Jalapeño Jam", qty: 0.01 },
  ]},
  { menuItem: "Tioga Ranch", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "American Cheese", qty: 0.01 },   { item: "Bacon", qty: 0.1 },
    { item: "Breaded Pickles", qty: 0.01 },   { item: "Ranch", qty: 0.01 },
  ]},
  { menuItem: "Georgia Caprese", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 },    { item: "Regular Buns", qty: 0.01 },
    { item: "Mozzarella, Shredded", qty: 0.01 }, { item: "Basil Pesto", qty: 0.01 },
    { item: "Peach Preserves", qty: 0.01 },      { item: "Balsamic Drizzle", qty: 0.01 },
  ]},
  { menuItem: "Bandito Smash", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "White Queso", qty: 0.01 },       { item: "Bacon", qty: 0.1 },
    { item: "Jalapeños", qty: 0.01 },         { item: "Onions", qty: 0.01 },
    { item: "Bandito Sauce", qty: 0.01 },
  ]},
  { menuItem: "Shroom Boom", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "Pepper Jack Cheese", qty: 0.01 }, { item: "Bacon", qty: 0.1 },
    { item: "Mushrooms", qty: 0.01 },          { item: "Onions", qty: 0.01 },
    { item: "Boom Boom Sauce", qty: 0.01 },
  ]},
  { menuItem: "Italian Stallion", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 },    { item: "Regular Buns", qty: 0.01 },
    { item: "Mozzarella, Shredded", qty: 0.01 }, { item: "Pepperoni", qty: 0.1 },
    { item: "Marinara Sauce", qty: 0.01 },        { item: "Parmesan Cheese", qty: 0.01 },
  ]},
  { menuItem: "Bleus Brother", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 },       { item: "Regular Buns", qty: 0.01 },
    { item: "Bleu Cheese", qty: 0.01 },              { item: "Bacon", qty: 0.1 },
    { item: "Onion Rings", qty: 0.01 },              { item: "Maple Bourbon BBQ Sauce", qty: 0.01 },
  ]},
  { menuItem: "Billy Berry Smash", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 },       { item: "Regular Buns", qty: 0.01 },
    { item: "White American Cheese", qty: 0.01 },   { item: "Bacon", qty: 0.1 },
    { item: "Goat Cheese Crema", qty: 0.01 },       { item: "Strawberry Jalapeño Jam", qty: 0.01 },
  ]},
  { menuItem: "Cousin Eddie", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "Pimento Cheese", qty: 0.01 },    { item: "Bacon", qty: 0.1 },
    { item: "Green Tomatoes", qty: 0.01 },    { item: "Five-Pepper Jam", qty: 0.01 },
  ]},
  { menuItem: "Ghost Rider", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "Cream Cheese", qty: 0.01 },      { item: "Bacon", qty: 0.1 },
    { item: "Jalapeños", qty: 0.01 },         { item: "Onions", qty: 0.01 },
    { item: "Ghost Pepper Jam", qty: 0.01 },
  ]},
  { menuItem: "Big Smack", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.5 },  // double patty
    { item: "Sesame Seed Buns", qty: 0.01 },  { item: "American Cheese", qty: 0.01 },
    { item: "Lettuce, Romaine", qty: 0.01 },  { item: "Onions", qty: 0.01 },
    { item: "Pickles", qty: 0.01 },           { item: "Cledis Sauce", qty: 0.01 },
  ]},
  { menuItem: "Blackberry Smoke", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 },         { item: "Regular Buns", qty: 0.01 },
    { item: "White American Cheese", qty: 0.01 },     { item: "Bacon", qty: 0.1 },
    { item: "Jalapeños", qty: 0.01 },                 { item: "Smoked Blackberry Preserves", qty: 0.01 },
    { item: "Mascarpone", qty: 0.01 },
  ]},

  // ── Sandwiches ────────────────────────────────────────────────────────────
  { menuItem: "Hoosier Daddy", ingredients: [
    { item: "Pork Tenderloin", qty: 0.5 },    { item: "Regular Buns", qty: 0.01 },
    { item: "Lettuce, Romaine", qty: 0.01 },  { item: "Tomatoes", qty: 0.01 },
    { item: "Onions", qty: 0.01 },            { item: "Pickles", qty: 0.01 },
    { item: "Mayo", qty: 0.01 },
  ]},
  { menuItem: "Fried Bologna", ingredients: [
    { item: "Bologna, Thick-Cut", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "American Cheese", qty: 0.01 },    { item: "Bacon", qty: 0.1 },
    { item: "Lettuce, Romaine", qty: 0.01 },   { item: "Tomatoes", qty: 0.01 },
    { item: "Onions", qty: 0.01 },             { item: "Pickles", qty: 0.01 },
    { item: "Mayo", qty: 0.01 },
  ]},
  { menuItem: "Larry Bird", ingredients: [
    { item: "Chicken Breast, Sliced", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "Cheddar Cheese", qty: 0.01 },          { item: "Bacon", qty: 0.1 },
    { item: "Lettuce, Romaine", qty: 0.01 },        { item: "Tomatoes", qty: 0.01 },
    { item: "Alabama White Sauce", qty: 0.01 },
  ]},
  { menuItem: "Raspberry Beret", ingredients: [
    { item: "Chicken Breast, Sliced", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "White American Cheese", qty: 0.01 },  { item: "Bacon", qty: 0.1 },
    { item: "Raspberry Preserves", qty: 0.01 },    { item: "Jalapeño Aioli", qty: 0.01 },
  ]},
  { menuItem: "Cheeseburger Tacos", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Flour Tortillas", qty: 0.01 },
    { item: "American Cheese", qty: 0.01 },   { item: "Onions", qty: 0.01 },
    { item: "Pickles", qty: 0.01 },           { item: "Bandito Sauce", qty: 0.01 },
  ]},
  { menuItem: "Peachy King", ingredients: [
    { item: "Chicken Breast, Sliced", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "Mozzarella, Shredded", qty: 0.01 },   { item: "Peach Preserves", qty: 0.01 },
    { item: "Basil Pesto", qty: 0.01 },             { item: "Balsamic Drizzle", qty: 0.01 },
  ]},
  { menuItem: "Balboa Jones", ingredients: [
    { item: "Chicken Breast, Sliced", qty: 0.25 }, { item: "Regular Buns", qty: 0.01 },
    { item: "Mozzarella, Shredded", qty: 0.01 },   { item: "Pepperoni", qty: 0.1 },
    { item: "Marinara Sauce", qty: 0.01 },          { item: "Parmesan Cheese", qty: 0.01 },
  ]},
  { menuItem: "Bleu Berry Melt", ingredients: [
    { item: "Regular Buns", qty: 0.01 },           { item: "White American Cheese", qty: 0.01 },
    { item: "Bleu Cheese", qty: 0.01 },            { item: "Onions", qty: 0.01 },
    { item: "Strawberry Jalapeño Jam", qty: 0.01 },
  ]},

  // ── Shareables + Salads ───────────────────────────────────────────────────
  { menuItem: "Dorito Bag Nachos", ingredients: [
    { item: "Doritos", qty: 0.01 },          { item: "White Queso", qty: 0.01 },
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Tomatoes", qty: 0.01 },
    { item: "Onions", qty: 0.01 },           { item: "Jalapeños", qty: 0.01 },
    { item: "Bandito Sauce", qty: 0.01 },
  ]},
  { menuItem: "Mozzarella Sticks", ingredients: [
    { item: "Mozzarella Sticks", qty: 0.01 }, { item: "Marinara Sauce", qty: 0.01 },
  ]},
  { menuItem: "Cheeseburger Salad", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Lettuce, Romaine", qty: 0.01 },
    { item: "Cheddar Cheese", qty: 0.01 },    { item: "Onions", qty: 0.01 },
    { item: "Tomatoes", qty: 0.01 },          { item: "Pickles", qty: 0.01 },
    { item: "Cledis Sauce", qty: 0.01 },      { item: "Croutons", qty: 0.01 },
  ]},
  { menuItem: "Garbage Pail Fries", ingredients: [
    { item: "French Fries", qty: 0.01 },     { item: "White Queso", qty: 0.01 },
    { item: "Ground Beef 80/20", qty: 0.25 }, { item: "Tomatoes", qty: 0.01 },
    { item: "Onions", qty: 0.01 },           { item: "Pickles", qty: 0.01 },
    { item: "Cledis Sauce", qty: 0.01 },
  ]},
  { menuItem: "Pickle Fries", ingredients: [
    { item: "Breaded Pickle Fries", qty: 0.01 }, { item: "Ranch", qty: 0.01 },
  ]},
  { menuItem: "Chicken BLT Salad", ingredients: [
    { item: "Chicken Breast, Sliced", qty: 0.25 }, { item: "Lettuce, Romaine", qty: 0.01 },
    { item: "Cheddar Cheese", qty: 0.01 },          { item: "Bacon", qty: 0.1 },
    { item: "Tomatoes", qty: 0.01 },                { item: "Ranch", qty: 0.01 },
    { item: "Croutons", qty: 0.01 },
  ]},

  // ── Sides ─────────────────────────────────────────────────────────────────
  { menuItem: "French Fries",          ingredients: [{ item: "French Fries", qty: 0.01 }] },
  { menuItem: "Truffle Shuffle Fries", ingredients: [
    { item: "French Fries", qty: 0.01 }, { item: "Truffle Oil", qty: 0.01 },
    { item: "Parmesan Cheese", qty: 0.01 },
  ]},
  { menuItem: "Cheese Fries", ingredients: [
    { item: "French Fries", qty: 0.01 }, { item: "White Queso", qty: 0.01 },
  ]},
  { menuItem: "Bacon Ranch Fries", ingredients: [
    { item: "French Fries", qty: 0.01 }, { item: "Bacon", qty: 0.1 },
    { item: "Ranch", qty: 0.01 },
  ]},
  { menuItem: "Onion Rings",   ingredients: [{ item: "Onion Rings", qty: 0.01 }] },
  { menuItem: "Bagged Chips",  ingredients: [{ item: "Potato Chips, Bagged", qty: 0.01 }] },

  // ── Wings ─────────────────────────────────────────────────────────────────
  { menuItem: "Wings (8)",   ingredients: [{ item: "Party Wings", qty: 0.5  }] },
  { menuItem: "Wings (25)",  ingredients: [{ item: "Party Wings", qty: 1.5  }] },
  { menuItem: "Wings (50)",  ingredients: [{ item: "Party Wings", qty: 3.0  }] },
  { menuItem: "Wings (75)",  ingredients: [{ item: "Party Wings", qty: 4.5  }] },
  { menuItem: "Wings (100)", ingredients: [{ item: "Party Wings", qty: 6.0  }] },

  // ── Kids ──────────────────────────────────────────────────────────────────
  { menuItem: "Kid's Burger", ingredients: [
    { item: "Ground Beef 80/20", qty: 0.09 }, // ~1.5 oz slider
    { item: "Potato Buns", qty: 0.01 },       { item: "American Cheese", qty: 0.01 },
  ]},
  { menuItem: "Kid's Chicken Melt", ingredients: [
    { item: "Chicken Breast, Sliced", qty: 0.15 },
    { item: "Potato Buns", qty: 0.01 }, { item: "American Cheese", qty: 0.01 },
  ]},
  { menuItem: "Kid's Grilled Cheese", ingredients: [
    { item: "Potato Buns", qty: 0.01 }, { item: "American Cheese", qty: 0.01 },
  ]},

  // Fountain Drink — Coca-Cola products, no inventory deduction needed
  { menuItem: "Fountain Drink", ingredients: [] },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Cledis inventory database...\n");

  // Locations
  const createdLocations: { id: string; name: string; multiplier: number }[] = [];
  for (const loc of LOCATIONS) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: {},
      create: {
        id: loc.id,
        name: loc.name,
        toastLocationId: loc.toastLocationId,
        alertWindowMinutes: 90,
        writeBackEnabled: false,
      },
    });
    createdLocations.push({ id: loc.id, name: loc.name, multiplier: loc.multiplier });
    console.log(`✓ Location: ${loc.name}`);
  }

  // Users — 1 manager + 1 staff per location
  const [managerPin, staffPin] = await Promise.all([
    bcrypt.hash("1234", 10),
    bcrypt.hash("0000", 10),
  ]);
  for (const loc of createdLocations) {
    const slug = loc.name.toLowerCase().replace(/\s+/g, "");
    await prisma.user.upsert({
      where: { email: `manager.${slug}@cledis.com` },
      update: {},
      create: {
        email: `manager.${slug}@cledis.com`,
        name: `${loc.name} Manager`,
        pin: managerPin,
        role: "MANAGER",
        locationId: loc.id,
      },
    });
    await prisma.user.upsert({
      where: { email: `staff.${slug}@cledis.com` },
      update: {},
      create: {
        email: `staff.${slug}@cledis.com`,
        name: `${loc.name} Staff`,
        pin: staffPin,
        role: "STAFF",
        locationId: loc.id,
      },
    });
  }
  console.log("✓ Users: 1 manager + 1 staff × 3 locations");

  // Inventory items — scaled par/safety by location multiplier
  let invCount = 0;
  for (const loc of createdLocations) {
    for (const def of INVENTORY_DEFS) {
      await prisma.inventoryItem.upsert({
        where: { locationId_name: { locationId: loc.id, name: def.name } },
        update: {},
        create: {
          name: def.name,
          unit: def.unit,
          parLevel: def.par * loc.multiplier,
          safetyStock: def.safety * loc.multiplier,
          category: def.category,
          locationId: loc.id,
        },
      });
      invCount++;
    }
  }
  console.log(`✓ ${invCount} inventory items (${INVENTORY_DEFS.length} × 3 locations)`);

  // Menu items — same names at all locations, placeholder Toast IDs per location
  let menuCount = 0;
  for (const loc of createdLocations) {
    const prefix = loc.name.substring(0, 3).toUpperCase();
    for (let i = 0; i < MENU_ITEM_NAMES.length; i++) {
      const name = MENU_ITEM_NAMES[i];
      const toastId = `PLACEHOLDER_${prefix}_${String(i + 1).padStart(3, "0")}`;
      await prisma.menuItem.upsert({
        where: { locationId_toastMenuItemId: { locationId: loc.id, toastMenuItemId: toastId } },
        update: {},
        create: { name, toastMenuItemId: toastId, locationId: loc.id },
      });
      menuCount++;
    }
  }
  console.log(`✓ ${menuCount} menu items (${MENU_ITEM_NAMES.length} × 3 locations)`);

  // Recipes — seeded for all locations
  let recipeCount = 0;
  for (const loc of createdLocations) {
    for (const recipeDef of RECIPES) {
      if (recipeDef.ingredients.length === 0) continue;
      const menuItem = await prisma.menuItem.findFirst({
        where: { locationId: loc.id, name: recipeDef.menuItem },
      });
      if (!menuItem) continue;

      for (const ing of recipeDef.ingredients) {
        const invItem = await prisma.inventoryItem.findFirst({
          where: { locationId: loc.id, name: ing.item },
        });
        if (!invItem) {
          console.warn(`  ⚠ Missing inventory item "${ing.item}" at ${loc.name}`);
          continue;
        }
        await prisma.recipe.upsert({
          where: { menuItemId_inventoryItemId: { menuItemId: menuItem.id, inventoryItemId: invItem.id } },
          update: {},
          create: {
            menuItemId: menuItem.id,
            inventoryItemId: invItem.id,
            quantityUsed: ing.qty,
            unit: invItem.unit,
          },
        });
        recipeCount++;
      }
    }
  }
  console.log(`✓ ${recipeCount} recipe ingredient mappings`);

  // ── Demo data — Elm Hill only ────────────────────────────────────────────
  // Bellevue and Gulch start clean (at par, no adjustments).
  const elmId = "loc-elm";
  const elmManager = await prisma.user.findFirstOrThrow({ where: { locationId: elmId, role: "MANAGER" } });
  const elmStaff   = await prisma.user.findFirstOrThrow({ where: { locationId: elmId, role: "STAFF"   } });

  const getItem = (name: string) =>
    prisma.inventoryItem.findFirstOrThrow({ where: { locationId: elmId, name } });

  await prisma.liveAdjustment.deleteMany({ where: { inventoryItem: { locationId: elmId } } });

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

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
      data: { inventoryItemId: item.id, userId, type, quantity, unit: item.unit, reason, note, createdAt },
    });
  };

  // Ground Beef — LOW (par=30, safety=8, low threshold=15, target=12)
  await adj("Ground Beef 80/20", "PREP",  20, elmManager.id, hoursAgo(10), undefined,    "Morning grind");
  await adj("Ground Beef 80/20", "WASTE",  8, elmStaff.id,   hoursAgo(4),  "EXPIRED",    "Overnight surplus");
  await adj("Ground Beef 80/20", "WASTE", 20, elmStaff.id,   hoursAgo(2),  "OVER_PREP",  "Prepped too much yesterday");
  await adj("Ground Beef 80/20", "WASTE", 10, elmStaff.id,   hoursAgo(1),  "DROPPED",    "Full hotel pan dropped");
  // net: 30 + 20 - 8 - 20 - 10 = 12 → LOW ✓

  // Party Wings — OK (par=20, safety=5, target=30)
  await adj("Party Wings", "PREP", 10, elmManager.id, hoursAgo(8), undefined, "Morning delivery");
  // net: 20 + 10 = 30 → OK ✓

  // French Fries — OK (par=5, safety=2, target=7)
  await adj("French Fries", "PREP", 2, elmStaff.id, hoursAgo(6), undefined, "Restocked from back");
  // net: 5 + 2 = 7 → OK ✓

  // Chicken Breast — OK (par=20, safety=5, target=28)
  await adj("Chicken Breast, Sliced", "PREP", 8, elmManager.id, hoursAgo(9), undefined, "Morning prep");
  // net: 20 + 8 = 28 → OK ✓

  // Bacon — CRITICAL (par=10, safety=3, target=3)
  await adj("Bacon", "WASTE", 7, elmStaff.id, hoursAgo(3), "EXPIRED", "Open pack left overnight");
  // net: 10 - 7 = 3 → CRITICAL (≤ safetyStock=3) ✓

  // Cledis Sauce — CRITICAL (par=5, safety=2, target=1)
  await adj("Cledis Sauce", "WASTE", 4, elmStaff.id, hoursAgo(2), "SPOILED", "Batch left out");
  // net: 5 - 4 = 1 → CRITICAL ✓

  // White Queso — CRITICAL (par=3, safety=1, target=1)
  await adj("White Queso", "WASTE", 2, elmStaff.id, hoursAgo(3), "OVER_PREP", "Too much prepped");
  // net: 3 - 2 = 1 → CRITICAL ✓

  // Regular Buns — OUT (par=5, safety=2)
  await adj("Regular Buns", "WASTE", 6, elmManager.id, hoursAgo(1), "EXPIRED", "Bad delivery — whole case rejected");
  // net: 5 - 6 = -1 → clamped to 0 → OUT ✓

  console.log("✓ Demo live adjustments (Elm Hill)");

  // Sale events
  await prisma.saleEvent.deleteMany({ where: { locationId: elmId } });
  const getMenuItem = (name: string) =>
    prisma.menuItem.findFirstOrThrow({ where: { locationId: elmId, name } });

  const salesDefs = [
    { name: "Cledis Burger",     qty: 12, orderId: "ORD-001", hoursBack: 5 },
    { name: "Big Smack",         qty: 6,  orderId: "ORD-002", hoursBack: 5 },
    { name: "French Fries",      qty: 18, orderId: "ORD-003", hoursBack: 4 },
    { name: "Wings (25)",        qty: 4,  orderId: "ORD-004", hoursBack: 4 },
    { name: "Larry Bird",        qty: 8,  orderId: "ORD-005", hoursBack: 3 },
    { name: "Shroom Boom",       qty: 5,  orderId: "ORD-006", hoursBack: 3 },
    { name: "Dorito Bag Nachos", qty: 7,  orderId: "ORD-007", hoursBack: 2 },
    { name: "Cledis Burger",     qty: 9,  orderId: "ORD-008", hoursBack: 2 },
    { name: "Cheese Fries",      qty: 11, orderId: "ORD-009", hoursBack: 1 },
    { name: "Wings (8)",         qty: 6,  orderId: "ORD-010", hoursBack: 1 },
  ];
  for (const s of salesDefs) {
    const mi = await getMenuItem(s.name);
    await prisma.saleEvent.create({
      data: {
        toastOrderId: s.orderId,
        quantity: s.qty,
        locationId: elmId,
        menuItemId: mi.id,
        createdAt: hoursAgo(s.hoursBack),
      },
    });
  }
  console.log(`✓ ${salesDefs.length} demo sale events (Elm Hill)`);

  // Alerts
  await prisma.alert.deleteMany({ where: { inventoryItem: { locationId: elmId } } });
  const beefItem   = await getItem("Ground Beef 80/20");
  const cledisItem = await getItem("Cledis Sauce");
  const quesoItem  = await getItem("White Queso");
  const baconItem  = await getItem("Bacon");
  const bunsItem   = await getItem("Regular Buns");

  await prisma.alert.create({ data: {
    inventoryItemId: bunsItem.id,   status: "ACTIVE",
    predictedDepletionAt: hoursAgo(1), // already out
    createdAt: hoursAgo(1),
  }});
  await prisma.alert.create({ data: {
    inventoryItemId: cledisItem.id, status: "ACTIVE",
    predictedDepletionAt: new Date(now.getTime() + 30 * 60_000),
    createdAt: hoursAgo(2),
  }});
  await prisma.alert.create({ data: {
    inventoryItemId: quesoItem.id,  status: "ACTIVE",
    predictedDepletionAt: new Date(now.getTime() + 45 * 60_000),
    createdAt: hoursAgo(3),
  }});
  await prisma.alert.create({ data: {
    inventoryItemId: baconItem.id,  status: "ACTIVE",
    predictedDepletionAt: new Date(now.getTime() + 60 * 60_000),
    createdAt: hoursAgo(3),
  }});
  // Resolved — beef was flagged earlier, manager acknowledged and prepped more
  await prisma.alert.create({ data: {
    inventoryItemId: beefItem.id,   status: "RESOLVED",
    predictedDepletionAt: hoursAgo(3),
    resolvedAt: hoursAgo(2),
    resolvedByUserId: elmManager.id,
    createdAt: hoursAgo(4),
  }});
  console.log("✓ 4 active + 1 resolved alerts (Elm Hill)");

  // Audit log
  await prisma.auditLog.deleteMany({ where: { locationId: elmId } });
  const auditEntries = [
    { action: "PREP",  details: { itemName: "Ground Beef 80/20",     quantity: 20, unit: "lb"    },                    hoursBack: 10, userId: elmManager.id },
    { action: "PREP",  details: { itemName: "Chicken Breast, Sliced", quantity: 8,  unit: "lb"    },                    hoursBack: 9,  userId: elmManager.id },
    { action: "PREP",  details: { itemName: "Party Wings",            quantity: 10, unit: "lb"    },                    hoursBack: 8,  userId: elmManager.id },
    { action: "PREP",  details: { itemName: "French Fries",           quantity: 2,  unit: "case"  },                    hoursBack: 6,  userId: elmStaff.id   },
    { action: "WASTE", details: { itemName: "Ground Beef 80/20",     quantity: 8,  unit: "lb",   reason: "EXPIRED"  }, hoursBack: 4,  userId: elmStaff.id   },
    { action: "WASTE", details: { itemName: "Bacon",                 quantity: 7,  unit: "lb",   reason: "EXPIRED"  }, hoursBack: 3,  userId: elmStaff.id   },
    { action: "WASTE", details: { itemName: "White Queso",           quantity: 2,  unit: "case",  reason: "OVER_PREP"}, hoursBack: 3, userId: elmStaff.id   },
    { action: "WASTE", details: { itemName: "Ground Beef 80/20",     quantity: 20, unit: "lb",   reason: "OVER_PREP"}, hoursBack: 2,  userId: elmStaff.id   },
    { action: "WASTE", details: { itemName: "Cledis Sauce",          quantity: 4,  unit: "batch", reason: "SPOILED"  }, hoursBack: 2, userId: elmStaff.id   },
    { action: "WASTE", details: { itemName: "Ground Beef 80/20",     quantity: 10, unit: "lb",   reason: "DROPPED"  }, hoursBack: 1,  userId: elmStaff.id   },
    { action: "WASTE", details: { itemName: "Regular Buns",          quantity: 6,  unit: "case", reason: "EXPIRED"  }, hoursBack: 1,  userId: elmManager.id },
  ];
  for (const e of auditEntries) {
    await prisma.auditLog.create({
      data: {
        action: e.action,
        entityType: "LiveAdjustment",
        entityId: "seed-" + Math.random().toString(36).slice(2, 8),
        details: e.details,
        locationId: elmId,
        userId: e.userId,
        createdAt: hoursAgo(e.hoursBack),
      },
    });
  }
  console.log(`✓ ${auditEntries.length} audit log entries (Elm Hill)`);

  console.log("\n✅ Cledis database seeded successfully!");
  console.log("\nLocations:");
  console.log("  Elm Hill  (×1 par) — demo data included");
  console.log("  Bellevue  (×2 par) — clean start");
  console.log("  Gulch     (×3 par) — clean start (opening soon)");
  console.log(`\nInventory: ${INVENTORY_DEFS.length} items × 3 locations = ${INVENTORY_DEFS.length * 3} total`);
  console.log(`Menu:      ${MENU_ITEM_NAMES.length} items × 3 locations = ${MENU_ITEM_NAMES.length * 3} total`);
  console.log("\nDefault logins (all locations):");
  console.log("  Manager PIN: 1234");
  console.log("  Staff PIN:   0000");
  console.log("\n⚠  PLACEHOLDERS TO REPLACE:");
  console.log("  • toastLocationId in LOCATIONS array — get from Toast dashboard");
  console.log("  • toastMenuItemId — run a sync once Toast is live to pull real IDs");
  console.log("  • Recipe case/batch quantities (0.01) — update as supplier case sizes confirmed");
  console.log("  • Par level multipliers (×1/×2/×3) — adjust per location once real pars are known");
}

main()
  .catch((e) => { console.error("❌ Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
