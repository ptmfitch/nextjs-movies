import { describe, expect, it } from "vitest";

import { escapeRegex } from "@/lib/regex";

describe("escapeRegex", () => {
  it("escapes regex special characters", () => {
    expect(escapeRegex("The Matrix (1999)")).toBe("The Matrix \\(1999\\)");
    expect(escapeRegex("C++")).toBe("C\\+\\+");
    expect(escapeRegex("a.b*c?")).toBe("a\\.b\\*c\\?");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeRegex("Inception")).toBe("Inception");
  });
});
