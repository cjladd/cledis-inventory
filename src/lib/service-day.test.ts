import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { stockWindowStart } from "./service-day";

const CHICAGO = { timezone: "America/Chicago", dayStartHour: 4 };

/** Render an instant as wall-clock time in a zone, for readable assertions. */
const wallClock = (d: Date, timeZone: string) =>
  d.toLocaleString("en-US", { timeZone, hour12: false });

describe("stockWindowStart", () => {
  test("after the cutoff, counts from today's cutoff", () => {
    // 10:00 CDT Wednesday
    const start = stockWindowStart(CHICAGO, new Date("2026-09-16T15:00:00Z"));
    assert.equal(wallClock(start, CHICAGO.timezone), "9/16/2026, 04:00:00");
  });

  test("before the cutoff, still counts from the previous service day", () => {
    // 01:00 CDT Wednesday - the kitchen is still working Tuesday night
    const start = stockWindowStart(CHICAGO, new Date("2026-09-16T06:00:00Z"));
    assert.equal(wallClock(start, CHICAGO.timezone), "9/15/2026, 04:00:00");
  });

  test("the cutoff instant itself belongs to the new day", () => {
    const start = stockWindowStart(CHICAGO, new Date("2026-09-16T09:00:00Z"));
    assert.equal(wallClock(start, CHICAGO.timezone), "9/16/2026, 04:00:00");
  });

  test("one minute before the cutoff belongs to the old day", () => {
    const start = stockWindowStart(CHICAGO, new Date("2026-09-16T08:59:00Z"));
    assert.equal(wallClock(start, CHICAGO.timezone), "9/15/2026, 04:00:00");
  });

  test("holds across the spring-forward transition", () => {
    const start = stockWindowStart(CHICAGO, new Date("2026-03-08T12:00:00Z"));
    assert.equal(wallClock(start, CHICAGO.timezone), "3/8/2026, 04:00:00");
  });

  test("holds across the fall-back transition", () => {
    const start = stockWindowStart(CHICAGO, new Date("2026-11-01T12:00:00Z"));
    assert.equal(wallClock(start, CHICAGO.timezone), "11/1/2026, 04:00:00");
  });

  test("holds in standard time", () => {
    const start = stockWindowStart(CHICAGO, new Date("2026-01-15T20:00:00Z"));
    assert.equal(wallClock(start, CHICAGO.timezone), "1/15/2026, 04:00:00");
  });

  test("respects a different location timezone", () => {
    const newYork = { timezone: "America/New_York", dayStartHour: 4 };
    // 02:00 EDT - before the cutoff in New York
    const start = stockWindowStart(newYork, new Date("2026-09-16T06:00:00Z"));
    assert.equal(wallClock(start, newYork.timezone), "9/15/2026, 04:00:00");
  });

  test("a midnight cutoff behaves like a calendar day", () => {
    const start = stockWindowStart(
      { timezone: CHICAGO.timezone, dayStartHour: 0 },
      new Date("2026-09-16T06:00:00Z")
    );
    assert.equal(wallClock(start, CHICAGO.timezone), "9/16/2026, 00:00:00");
  });

  test("an unusable timezone falls back to UTC midnight instead of throwing", () => {
    const start = stockWindowStart(
      { timezone: "Not/AZone", dayStartHour: 4 },
      new Date("2026-09-16T15:00:00Z")
    );
    assert.equal(start.toISOString(), "2026-09-16T00:00:00.000Z");
  });

  test("an out-of-range cutoff hour is clamped to 23", () => {
    // Clamped to 23:00, and 10:00 local is before that, so the current service
    // day began at 23:00 the previous night.
    const start = stockWindowStart(
      { timezone: CHICAGO.timezone, dayStartHour: 99 },
      new Date("2026-09-16T15:00:00Z")
    );
    assert.equal(wallClock(start, CHICAGO.timezone), "9/15/2026, 23:00:00");
  });
});
