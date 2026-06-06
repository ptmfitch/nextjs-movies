import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchBar } from "@/components/SearchBar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("q=matrix"),
}));

describe("SearchBar", () => {
  it("renders with the current search query", () => {
    render(<SearchBar />);
    expect(screen.getByRole("searchbox")).toHaveValue("matrix");
  });

  it("submits a trimmed search query", () => {
    render(<SearchBar />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "  inception  " },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Search" }));

    expect(push).toHaveBeenCalledWith("/?q=inception");
  });
});
