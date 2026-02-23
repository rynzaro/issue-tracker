import { describe, it, expect } from "vitest";
import { formatTime, calculateDurationInSeconds } from "@/lib/util";

describe("calculateDurationInSeconds", () => {
  it("returns 0 for same start and stop", () => {
    const d = new Date("2026-01-01T10:00:00Z");
    expect(calculateDurationInSeconds(d, d)).toBe(0);
  });

  it("returns correct seconds for 1 hour", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const stop = new Date("2026-01-01T11:00:00Z");
    expect(calculateDurationInSeconds(start, stop)).toBe(3600);
  });

  it("floors fractional seconds", () => {
    const start = new Date("2026-01-01T10:00:00.000Z");
    const stop = new Date("2026-01-01T10:00:01.999Z");
    expect(calculateDurationInSeconds(start, stop)).toBe(1);
  });
});

describe("formatTime", () => {
  describe("HH:MM format", () => {
    it("formats minutes to hours and minutes", () => {
      expect(formatTime(90, "min", "HH:MM", false)).toBe("1:30");
    });

    it("formats with leading zeros", () => {
      expect(formatTime(90, "min", "HH:MM", true)).toBe("01:30");
    });

    it("omits hours when zero and leading_zeros is false", () => {
      expect(formatTime(45, "min", "HH:MM", false)).toBe("45");
    });

    it("shows zero hours when leading_zeros is true", () => {
      expect(formatTime(45, "min", "HH:MM", true)).toBe("00:45");
    });

    it("handles 0 minutes", () => {
      expect(formatTime(0, "min", "HH:MM", false)).toBe("0");
    });

    it("handles 0 minutes with leading zeros", () => {
      expect(formatTime(0, "min", "HH:MM", true)).toBe("00:00");
    });

    it("converts seconds to HH:MM", () => {
      expect(formatTime(5400, "sec", "HH:MM", false)).toBe("1:30");
    });

    it("converts milliseconds to HH:MM", () => {
      expect(formatTime(5_400_000, "ms", "HH:MM", false)).toBe("1:30");
    });
  });

  describe("MM:SS format", () => {
    it("formats seconds to minutes and seconds", () => {
      expect(formatTime(75, "sec", "MM:SS", false)).toBe("1:15");
    });

    it("formats with leading zeros", () => {
      expect(formatTime(75, "sec", "MM:SS", true)).toBe("01:15");
    });

    it("omits minutes when zero and leading_zeros is false", () => {
      expect(formatTime(45, "sec", "MM:SS", false)).toBe("45");
    });

    it("shows zero minutes when leading_zeros is true", () => {
      expect(formatTime(45, "sec", "MM:SS", true)).toBe("00:45");
    });

    it("pads seconds when minutes are present", () => {
      expect(formatTime(65, "sec", "MM:SS", false)).toBe("1:05");
    });
  });

  describe("HH:MM:SS format", () => {
    it("formats seconds to hours, minutes, and seconds", () => {
      expect(formatTime(3661, "sec", "HH:MM:SS", false)).toBe("1:01:01");
    });

    it("formats with leading zeros", () => {
      expect(formatTime(3661, "sec", "HH:MM:SS", true)).toBe("01:01:01");
    });

    it("omits hours when zero and leading_zeros is false", () => {
      expect(formatTime(61, "sec", "HH:MM:SS", false)).toBe("1:01");
    });

    it("omits hours and minutes when both zero and leading_zeros is false", () => {
      expect(formatTime(45, "sec", "HH:MM:SS", false)).toBe("45");
    });

    it("shows all components when leading_zeros is true even if zero", () => {
      expect(formatTime(45, "sec", "HH:MM:SS", true)).toBe("00:00:45");
    });

    it("handles 0", () => {
      expect(formatTime(0, "sec", "HH:MM:SS", false)).toBe("0");
      expect(formatTime(0, "sec", "HH:MM:SS", true)).toBe("00:00:00");
    });
  });

  describe("edge cases", () => {
    it("handles negative input without throwing", () => {
      // Negative input is undefined behavior, but should not crash
      expect(() => formatTime(-60, "sec", "MM:SS", false)).not.toThrow();
    });

    it("handles very large values (24+ hours)", () => {
      expect(formatTime(86400, "sec", "HH:MM", false)).toBe("24:00");
      expect(formatTime(90061, "sec", "HH:MM:SS", false)).toBe("25:01:01");
    });
  });
});
