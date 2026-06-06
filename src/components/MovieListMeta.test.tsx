import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MovieListMeta } from "@/components/MovieListMeta";

describe("MovieListMeta", () => {
  it("renders the browse heading and range text", () => {
    render(<MovieListMeta start={1} end={24} total={150} />);

    expect(screen.getByRole("heading", { name: "Latest movies" })).toBeInTheDocument();
    expect(screen.getByText("Showing 1–24 movies out of 150")).toBeInTheDocument();
  });

  it("renders the search heading when a query is provided", () => {
    render(<MovieListMeta start={1} end={3} total={3} query="matrix" />);

    expect(
      screen.getByRole("heading", { name: 'Results for "matrix"' }),
    ).toBeInTheDocument();
    expect(screen.getByText("Showing 1–3 movies out of 3")).toBeInTheDocument();
  });
});
