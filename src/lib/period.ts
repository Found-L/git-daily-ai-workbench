import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  getISOWeek,
  getISOWeekYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import type { PeriodWindow, ReportPeriod } from "@/lib/types";

function parseIsoWeekReference(reference: string, timezone: string) {
  const match = reference.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) {
    return undefined;
  }

  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = januaryFourth.getUTCDay() || 7;
  const monday = new Date(Date.UTC(year, 0, 4 - dayOfWeek + 1 + (week - 1) * 7, 12));
  const mondayIso = monday.toISOString().slice(0, 10);

  return fromZonedTime(`${mondayIso}T12:00:00`, timezone);
}

export function parsePeriodReference(
  period: ReportPeriod,
  timezone: string,
  reference?: string,
) {
  if (!reference) {
    return undefined;
  }

  if (period === "day" && /^\d{4}-\d{2}-\d{2}$/.test(reference)) {
    return fromZonedTime(`${reference}T12:00:00`, timezone);
  }

  if (period === "week") {
    return parseIsoWeekReference(reference, timezone);
  }

  if (period === "month" && /^\d{4}-\d{2}$/.test(reference)) {
    return fromZonedTime(`${reference}-15T12:00:00`, timezone);
  }

  return undefined;
}

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

export function resolveCurrentReference(
  period: ReportPeriod,
  timezone: string,
  referenceDate = new Date(),
) {
  const zonedNow = toZonedTime(referenceDate, timezone);

  if (period === "day") {
    const pickerSeed = formatInTimeZone(referenceDate, timezone, "yyyy-MM-dd");
    return {
      pickerSeed,
      referenceValue: pickerSeed,
    };
  }

  if (period === "month") {
    return {
      pickerSeed: formatInTimeZone(referenceDate, timezone, "yyyy-MM-01"),
      referenceValue: formatInTimeZone(referenceDate, timezone, "yyyy-MM"),
    };
  }

  const weekStartLocal = startOfWeek(zonedNow, { weekStartsOn: 1 });
  const weekStart = fromZonedTime(weekStartLocal, timezone);

  return {
    pickerSeed: formatInTimeZone(weekStart, timezone, "yyyy-MM-dd"),
    referenceValue: `${getISOWeekYear(weekStartLocal)}-W${String(getISOWeek(weekStartLocal)).padStart(2, "0")}`,
  };
}

export function isDateWithinWindow(date: Date, window: PeriodWindow) {
  return date >= window.start && date <= window.end;
}
