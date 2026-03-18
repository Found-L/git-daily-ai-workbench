import { describe, expect, it } from "vitest";

import { resolvePeriodWindow } from "@/lib/period";

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
});
