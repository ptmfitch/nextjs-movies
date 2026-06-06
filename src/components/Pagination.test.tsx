import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Pagination } from "@/components/Pagination";

let searchParams = new URLSearchParams("q=matrix&page=2&sort=title-asc");

const push = vi.fn((url: string) => {
  if (url.startsWith("/?")) {
    searchParams = new URLSearchParams(url.slice(2));
  }
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

describe("Pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams("q=matrix&page=2&sort=title-asc");
  });

  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination page={1} total={10} pageSize={24} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("disables previous on the first page and next on the last page", () => {
    const { rerender } = render(
      <Pagination page={1} total={50} pageSize={24} />,
    );

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();

    rerender(<Pagination page={3} total={50} pageSize={24} />);

    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("navigates to adjacent pages while preserving query params", () => {
    render(<Pagination page={2} total={50} pageSize={24} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(push).toHaveBeenCalledWith("/?q=matrix&sort=title-asc");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(push).toHaveBeenCalledWith("/?q=matrix&page=3&sort=title-asc");
  });
});
