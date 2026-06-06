import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SearchBar } from "@/components/SearchBar";

let searchParams = new URLSearchParams("q=matrix&page=2&sort=title-asc");

const push = vi.fn((url: string) => {
  if (url === "/") {
    searchParams = new URLSearchParams();
    return;
  }

  if (url.startsWith("/?")) {
    searchParams = new URLSearchParams(url.slice(2));
  }
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams("q=matrix&page=2&sort=title-asc");
  });

  it("renders with the current search query", () => {
    render(<SearchBar />);
    expect(screen.getByRole("searchbox")).toHaveValue("matrix");
  });

  it("submits a trimmed search query and preserves sort while resetting page", () => {
    render(<SearchBar />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "  inception  " },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Search" }));

    expect(push).toHaveBeenCalledWith("/?q=inception&sort=title-asc");
  });

  it("clears the query and navigates home", () => {
    const { rerender } = render(<SearchBar />);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    rerender(<SearchBar />);

    expect(push).toHaveBeenCalledWith("/");
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("syncs the input when the URL search params change", () => {
    const { rerender } = render(<SearchBar />);
    expect(screen.getByRole("searchbox")).toHaveValue("matrix");

    searchParams = new URLSearchParams("q=avatar");
    rerender(<SearchBar />);

    expect(screen.getByRole("searchbox")).toHaveValue("avatar");
  });
});
