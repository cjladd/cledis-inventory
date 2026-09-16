/**
 * Service-day boundaries.
 *
 * Stock is a running total of adjustments and sales, so it needs a point to
 * count from. Until physical counts are modelled (see docs/decisions.md), that
 * point is the start of the current service day: `dayStartHour` local time at
 * the location, not midnight UTC. A kitchen that closes at 1am is still working
 * the previous business day, and three locations in one company can sit in
 * different zones, so both the hour and the zone are per-location.
 *
 * When InventoryCount lands, `stockWindowStart` becomes "the timestamp of the
 * last count" and every caller keeps working unchanged.
 */

export interface ServiceDayConfig {
  timezone: string;
  dayStartHour: number;
}

/**
 * Offset, in ms, between a zone's local wall clock and UTC at a given instant.
 * Positive west of UTC is expressed as a negative number, matching `getTime()`
 * arithmetic.
 */
function zoneOffsetMs(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12:   false,
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
    hour:     "2-digit",
    minute:   "2-digit",
    second:   "2-digit",
  }).formatToParts(instant);

  const field = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  // formatToParts can render midnight as hour 24; normalise it.
  const asIfUtc = Date.UTC(
    field("year"),
    field("month") - 1,
    field("day"),
    field("hour") % 24,
    field("minute"),
    field("second")
  );

  return asIfUtc - instant.getTime();
}

/** The UTC instant for a wall-clock time in a given zone. */
function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, 0, 0, 0);

  // One correction lands it; a second settles the DST edge where the first
  // guess falls on the other side of a transition.
  let utc = naive - zoneOffsetMs(new Date(naive), timezone);
  utc = naive - zoneOffsetMs(new Date(utc), timezone);

  return new Date(utc);
}

/**
 * Start of the service day containing `now` for the given location config.
 *
 * Falls back to UTC midnight if the zone is unusable, so a bad config row
 * degrades to a wrong-but-bounded window rather than throwing on every request.
 */
export function stockWindowStart(
  config: ServiceDayConfig,
  now: Date = new Date()
): Date {
  const hour = Number.isInteger(config.dayStartHour)
    ? Math.min(23, Math.max(0, config.dayStartHour))
    : 4;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: config.timezone,
      hour12:   false,
      year:     "numeric",
      month:    "2-digit",
      day:      "2-digit",
      hour:     "2-digit",
    }).formatToParts(now);

    const field = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");

    const localHour = field("hour") % 24;

    let start = zonedWallTimeToUtc(
      field("year"),
      field("month"),
      field("day"),
      hour,
      config.timezone
    );

    // Before the cutoff, we are still on the previous service day.
    if (localHour < hour) {
      start = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    }

    return start;
  } catch {
    const fallback = new Date(now);
    fallback.setUTCHours(0, 0, 0, 0);
    return fallback;
  }
}
