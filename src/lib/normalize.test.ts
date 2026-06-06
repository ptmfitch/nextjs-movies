import { describe, expect, it } from "vitest";

import { normalizeYear } from "@/lib/normalize";

describe("normalizeYear", () => {
  it("returns numeric years unchanged", () => {
    expect(normalizeYear(2014)).toBe(2014);
  });

  it("extracts a four-digit year from dirty strings", () => {
    expect(normalizeYear("2014è")).toBe(2014);
  });

  it("returns 0 for missing or invalid values", () => {
    expect(normalizeYear(undefined)).toBe(0);
    expect(normalizeYear("")).toBe(0);
  });
});
