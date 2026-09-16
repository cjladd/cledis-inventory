import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { computeStockFromData, getStockStatus } from "./inventory";
import type { AdjustmentRow, RecipeWithSales } from "./inventory";

const sales = (...quantities: number[]): RecipeWithSales["menuItem"] => ({
  saleEvents: quantities.map((quantity) => ({ quantity })),
});

describe("getStockStatus", () => {
  test("zero or less is out", () => {
    assert.equal(getStockStatus(0, 40, 8), "out");
    assert.equal(getStockStatus(-3, 40, 8), "out");
  });

  test("at or below safety stock is critical", () => {
    assert.equal(getStockStatus(8, 40, 8), "critical");
    assert.equal(getStockStatus(5, 40, 8), "critical");
  });

  test("at or below half of par is low", () => {
    assert.equal(getStockStatus(20, 40, 8), "low");
    assert.equal(getStockStatus(12, 40, 8), "low");
  });

  test("above half of par is ok", () => {
    assert.equal(getStockStatus(21, 40, 8), "ok");
    assert.equal(getStockStatus(40, 40, 8), "ok");
  });

  test("safety stock above half par takes precedence over low", () => {
    // A badly configured item should still read critical, not low.
    assert.equal(getStockStatus(25, 40, 30), "critical");
  });
});

describe("computeStockFromData", () => {
  test("par alone, with no activity", () => {
    const result = computeStockFromData(40, 8, [], []);
    assert.equal(result.currentStock, 40);
    assert.equal(result.status, "ok");
  });

  test("adds prep, subtracts waste, applies manual adjustments", () => {
    const adjustments: AdjustmentRow[] = [
      { type: "PREP", quantity: 10 },
      { type: "PREP", quantity: 5 },
      { type: "WASTE", quantity: 3 },
      { type: "MANUAL", quantity: -2 },
    ];

    const result = computeStockFromData(40, 8, adjustments, []);

    assert.equal(result.prepTotal, 15);
    assert.equal(result.wasteTotal, 3);
    assert.equal(result.manualTotal, -2);
    assert.equal(result.currentStock, 50); // 40 + 15 - 3 - 2
  });

  test("subtracts sales scaled by recipe quantity", () => {
    const recipes: RecipeWithSales[] = [
      { quantityUsed: 0.25, menuItem: sales(4, 4) }, // 8 burgers x 0.25 lb = 2
      { quantityUsed: 0.5, menuItem: sales(2) },     // 2 plates x 0.5 lb  = 1
    ];

    const result = computeStockFromData(40, 8, [], recipes);

    assert.equal(result.salesDepletion, 3);
    assert.equal(result.currentStock, 37);
  });

  test("never reports negative stock", () => {
    const result = computeStockFromData(10, 2, [{ type: "WASTE", quantity: 99 }], []);
    assert.equal(result.currentStock, 0);
    assert.equal(result.status, "out");
  });

  test("rounds to two decimals rather than leaking float noise", () => {
    const recipes: RecipeWithSales[] = [
      { quantityUsed: 0.1, menuItem: sales(1, 1, 1) },
    ];
    const result = computeStockFromData(1, 0.5, [], recipes);
    assert.equal(result.currentStock, 0.7);
  });

  test("an empty sale list depletes nothing", () => {
    const recipes: RecipeWithSales[] = [{ quantityUsed: 2, menuItem: sales() }];
    assert.equal(computeStockFromData(40, 8, [], recipes).salesDepletion, 0);
  });
});
