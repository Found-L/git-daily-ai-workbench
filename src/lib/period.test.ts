import { describe, expect, it } from "vitest";

import { parsePeriodReference, resolvePeriodWindow } from "@/lib/period";

describe("resolvePeriodWindow", () => {
  it("builds a natural day range in the configured timezone", () => {
    const window = resolvePeriodWindow("day", "Asia/Shanghai", new Date("2026-03-18T12:00:00.000Z"));

    expect(window.label).toContain("2026-03-18");
    expect(window.start.toISOString()).toBe("2026-03-17T16:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-03-18T15:59:59.999Z");
  });

  it("builds a week range that starts on Monday", () => {
    const window = resolvePeriodWindow("week", "Asia/Shanghai", new Date("2026-03-18T12:00:00.000Z"));

    expect(window.start.toISOString()).toBe("2026-03-15T16:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-03-22T15:59:59.999Z");
  });

  it("parses explicit day, week, and month references", () => {
    expect(parsePeriodReference("day", "Asia/Shanghai", "2026-03-18")?.toISOString()).toBe(
      "2026-03-18T04:00:00.000Z",
    );
    expect(parsePeriodReference("week", "Asia/Shanghai", "2026-W12")?.toISOString()).toBe(
      "2026-03-16T04:00:00.000Z",
    );
    expect(parsePeriodReference("month", "Asia/Shanghai", "2026-03")?.toISOString()).toBe(
      "2026-03-15T04:00:00.000Z",
    );
  });
});
