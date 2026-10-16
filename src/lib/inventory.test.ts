import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { computeStockFromData, getStockStatus, earliestBasis } from "./inventory";
import type { AdjustmentRow, RecipeWithSales, StockBasis } from "./inventory";

const T0 = new Date("2026-10-16T12:00:00Z");
const at = (minutesAfterT0: number) =>
  new Date(T0.getTime() + minutesAfterT0 * 60_000);

/** A count taken at T0 — the normal case once someone has walked the cooler. */
const countedAt0 = (quantity: number): StockBasis => ({
  baseline:        quantity,
  since:           T0,
  source:          "count",
  countedAt:       T0,
  countedQuantity: quantity,
  storageArea:     "COOLER",
});

/** The fallback for an item nobody has counted: par from the service-day start. */
const parBasis = (parLevel: number): StockBasis => ({
  baseline:        parLevel,
  since:           T0,
  source:          "par",
  countedAt:       null,
  countedQuantity: null,
  storageArea:     null,
});

const sales = (
  ...entries: { quantity: number; minutes: number }[]
): RecipeWithSales["menuItem"] => ({
  saleEvents: entries.map((e) => ({ quantity: e.quantity, createdAt: at(e.minutes) })),
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

describe("computeStockFromData — counted basis", () => {
  test("counts forward from the counted quantity, not par", () => {
    // Par is 40, but someone counted 12. The count wins.
    const result = computeStockFromData(countedAt0(12), 40, 8, [], []);
    assert.equal(result.currentStock, 12);
    assert.equal(result.basis, "count");
    assert.equal(result.countedQuantity, 12);
  });

  test("adds prep, subtracts waste, applies manual adjustments", () => {
    const adjustments: AdjustmentRow[] = [
      { type: "PREP",   quantity: 10, createdAt: at(30) },
      { type: "PREP",   quantity: 5,  createdAt: at(60) },
      { type: "WASTE",  quantity: 3,  createdAt: at(90) },
      { type: "MANUAL", quantity: -2, createdAt: at(120) },
    ];

    const result = computeStockFromData(countedAt0(20), 40, 8, adjustments, []);

    assert.equal(result.prepTotal, 15);
    assert.equal(result.wasteTotal, 3);
    assert.equal(result.manualTotal, -2);
    assert.equal(result.currentStock, 30); // 20 + 15 - 3 - 2
  });

  test("ignores activity from before the count", () => {
    // The whole point of a count: what happened before it is already reflected
    // in the number someone wrote down.
    const adjustments: AdjustmentRow[] = [
      { type: "PREP",  quantity: 50, createdAt: at(-120) },
      { type: "WASTE", quantity: 30, createdAt: at(-60) },
      { type: "PREP",  quantity: 4,  createdAt: at(15) },
    ];

    const result = computeStockFromData(countedAt0(10), 40, 8, adjustments, []);

    assert.equal(result.prepTotal, 4);
    assert.equal(result.wasteTotal, 0);
    assert.equal(result.currentStock, 14);
  });

  test("ignores sales from before the count", () => {
    const recipes: RecipeWithSales[] = [
      { quantityUsed: 0.25, menuItem: sales(
        { quantity: 40, minutes: -30 },  // before the count
        { quantity: 8,  minutes: 45 },   // after
      ) },
    ];

    const result = computeStockFromData(countedAt0(10), 40, 8, [], recipes);

    assert.equal(result.salesDepletion, 2); // 8 x 0.25, the earlier 40 excluded
    assert.equal(result.currentStock, 8);
  });

  test("subtracts sales scaled by recipe quantity", () => {
    const recipes: RecipeWithSales[] = [
      { quantityUsed: 0.25, menuItem: sales({ quantity: 4, minutes: 10 }, { quantity: 4, minutes: 20 }) },
      { quantityUsed: 0.5,  menuItem: sales({ quantity: 2, minutes: 30 }) },
    ];

    const result = computeStockFromData(countedAt0(40), 40, 8, [], recipes);

    assert.equal(result.salesDepletion, 3); // (8 x 0.25) + (2 x 0.5)
    assert.equal(result.currentStock, 37);
  });

  test("an event exactly at the count instant is included", () => {
    const adjustments: AdjustmentRow[] = [
      { type: "PREP", quantity: 6, createdAt: T0 },
    ];
    assert.equal(
      computeStockFromData(countedAt0(10), 40, 8, adjustments, []).currentStock,
      16
    );
  });

  test("never reports negative stock", () => {
    const adjustments: AdjustmentRow[] = [
      { type: "WASTE", quantity: 99, createdAt: at(10) },
    ];
    const result = computeStockFromData(countedAt0(10), 10, 2, adjustments, []);
    assert.equal(result.currentStock, 0);
    assert.equal(result.status, "out");
  });

  test("rounds to two decimals rather than leaking float noise", () => {
    const recipes: RecipeWithSales[] = [
      { quantityUsed: 0.1, menuItem: sales(
        { quantity: 1, minutes: 1 },
        { quantity: 1, minutes: 2 },
        { quantity: 1, minutes: 3 },
      ) },
    ];
    assert.equal(computeStockFromData(countedAt0(1), 1, 0.5, [], recipes).currentStock, 0.7);
  });

  test("carries provenance through to the result", () => {
    const result = computeStockFromData(countedAt0(18), 40, 8, [], []);
    assert.equal(result.basis, "count");
    assert.equal(result.countedAt?.getTime(), T0.getTime());
    assert.equal(result.storageArea, "COOLER");
  });
});

describe("computeStockFromData — par fallback", () => {
  test("an uncounted item still counts forward from par", () => {
    const result = computeStockFromData(parBasis(40), 40, 8, [], []);
    assert.equal(result.currentStock, 40);
    assert.equal(result.basis, "par");
    assert.equal(result.countedAt, null);
    assert.equal(result.countedQuantity, null);
  });

  test("par fallback applies the same arithmetic", () => {
    const adjustments: AdjustmentRow[] = [
      { type: "PREP",  quantity: 10, createdAt: at(30) },
      { type: "WASTE", quantity: 4,  createdAt: at(60) },
    ];
    assert.equal(
      computeStockFromData(parBasis(40), 40, 8, adjustments, []).currentStock,
      46
    );
  });
});

describe("earliestBasis", () => {
  test("returns the widest cutoff across a page of items", () => {
    const bases = new Map<string, StockBasis>([
      ["a", { ...countedAt0(5), since: at(-600) }],
      ["b", { ...countedAt0(5), since: at(-60) }],
      ["c", { ...countedAt0(5), since: T0 }],
    ]);
    assert.equal(earliestBasis(bases).getTime(), at(-600).getTime());
  });

  test("an empty page does not throw", () => {
    assert.ok(earliestBasis(new Map()) instanceof Date);
  });
});
