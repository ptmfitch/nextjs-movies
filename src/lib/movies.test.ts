import { describe, expect, it } from "vitest";

import { buildTitleSearchFilter } from "@/lib/movies";

describe("buildTitleSearchFilter", () => {
  it("returns an empty filter for blank queries", () => {
    expect(buildTitleSearchFilter("")).toEqual({});
    expect(buildTitleSearchFilter("   ")).toEqual({});
  });

  it("builds a case-insensitive title regex filter", () => {
    expect(buildTitleSearchFilter("matrix")).toEqual({
      title: { $regex: "matrix", $options: "i" },
    });
  });

  it("escapes regex characters in the query", () => {
    expect(buildTitleSearchFilter("C++")).toEqual({
      title: { $regex: "C\\+\\+", $options: "i" },
    });
  });
});
