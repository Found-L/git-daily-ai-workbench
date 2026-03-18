import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import type { PeriodWindow, ReportPeriod } from "@/lib/types";

export function resolvePeriodWindow(
  period: ReportPeriod,
  timezone: string,
  referenceDate = new Date(),
): PeriodWindow {
  const zonedNow = toZonedTime(referenceDate, timezone);

  let rangeStartLocal = zonedNow;
  let rangeEndLocal = zonedNow;

  if (period === "day") {
    rangeStartLocal = startOfDay(zonedNow);
    rangeEndLocal = endOfDay(zonedNow);
  } else if (period === "week") {
    rangeStartLocal = startOfWeek(zonedNow, { weekStartsOn: 1 });
    rangeEndLocal = endOfWeek(zonedNow, { weekStartsOn: 1 });
  } else {
    rangeStartLocal = startOfMonth(zonedNow);
    rangeEndLocal = endOfMonth(zonedNow);
  }

  const start = fromZonedTime(rangeStartLocal, timezone);
  const end = fromZonedTime(rangeEndLocal, timezone);
  const label = `${formatInTimeZone(start, timezone, "yyyy-MM-dd HH:mm")} -> ${formatInTimeZone(
    end,
    timezone,
    "yyyy-MM-dd HH:mm",
  )}`;

  return {
    period,
    timezone,
    label,
    start,
    end,
  };
}

export function isDateWithinWindow(date: Date, window: PeriodWindow) {
  return date >= window.start && date <= window.end;
}
