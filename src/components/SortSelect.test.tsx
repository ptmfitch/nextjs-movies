import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SortSelect } from "@/components/SortSelect";

let searchParams = new URLSearchParams("q=matrix&page=2&sort=year-desc");

const push = vi.fn((url: string) => {
  if (url.startsWith("/?")) {
    searchParams = new URLSearchParams(url.slice(2));
  }
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

describe("SortSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams("q=matrix&page=2&sort=year-desc");
  });

  it("renders with the current sort value", () => {
    render(<SortSelect />);
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveValue(
      "year-desc",
    );
  });

  it("changes sort and resets page to 1", () => {
    render(<SortSelect />);

    fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), {
      target: { value: "title-asc" },
    });

    expect(push).toHaveBeenCalledWith("/?q=matrix&sort=title-asc");
  });
});
