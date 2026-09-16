import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { calculateSeasonality, predictDepletionFromRates } from "./forecast";
import type { DayOfWeekRates } from "./forecast";

const HOUR_MS = 3_600_000;

/** Every weekday depletes at the same rate, so seasonality is flat. */
const flatRates = (perDay: number): DayOfWeekRates => ({
  rates:      Array(7).fill(perDay),
  overallAvg: perDay,
});

/** Local midnight, chosen well away from any DST transition. */
const localMidnight = () => new Date(2026, 8, 16, 0, 0, 0, 0);

const hoursBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / HOUR_MS;

describe("calculateSeasonality", () => {
  test("returns the ratio of each day to the average", () => {
    const seasonality = calculateSeasonality([10, 20, 20, 20, 20, 30, 20], 20);
    assert.equal(seasonality[0], 0.5);
    assert.equal(seasonality[1], 1);
    assert.equal(seasonality[5], 1.5);
  });

  test("falls back to flat multipliers when there is no history", () => {
    assert.deepEqual(calculateSeasonality([0, 0, 0, 0, 0, 0, 0], 0), [1, 1, 1, 1, 1, 1, 1]);
  });
});

describe("predictDepletionFromRates", () => {
  test("depletes at the hourly rate implied by the daily average", () => {
    const now = localMidnight();
    // 24 units/day = 1 unit/hour, so 10 units lasts 10 hours.
    const depletion = predictDepletionFromRates(10, flatRates(24), now);

    assert.ok(depletion);
    assert.equal(hoursBetween(now, depletion), 10);
  });

  test("interpolates inside the day it runs out rather than snapping to a boundary", () => {
    const now = localMidnight();
    const depletion = predictDepletionFromRates(2.5, flatRates(24), now);

    assert.ok(depletion);
    assert.equal(hoursBetween(now, depletion), 2.5);
  });

  test("carries across midnight into the next day", () => {
    const now = localMidnight();
    // 30 units at 1/hour runs 6 hours past the end of the first day.
    const depletion = predictDepletionFromRates(30, flatRates(24), now);

    assert.ok(depletion);
    assert.equal(hoursBetween(now, depletion), 30);
  });

  test("stock already at zero is depleted now", () => {
    const now = localMidnight();
    assert.equal(predictDepletionFromRates(0, flatRates(24), now)?.getTime(), now.getTime());
  });

  test("no sales history means no prediction", () => {
    assert.equal(predictDepletionFromRates(10, flatRates(0), localMidnight()), null);
  });

  test("stock that outlasts the horizon returns null", () => {
    // 1 unit/day against 10000 units is far beyond the 30-day horizon.
    assert.equal(predictDepletionFromRates(10_000, flatRates(1), localMidnight()), null);
  });

  test("a busier weekday depletes faster than a quiet one", () => {
    const now = localMidnight(); // 2026-09-16 is a Wednesday (day 3)
    const busyWednesday: DayOfWeekRates = {
      rates:      [24, 24, 24, 48, 24, 24, 24],
      overallAvg: 24,
    };

    const flat = predictDepletionFromRates(10, flatRates(24), now);
    const busy = predictDepletionFromRates(10, busyWednesday, now);

    assert.ok(flat && busy);
    assert.ok(
      busy.getTime() < flat.getTime(),
      "a day with double the rate should run out sooner"
    );
  });
});
