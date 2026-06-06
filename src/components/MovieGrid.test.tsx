import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MovieGrid } from "@/components/MovieGrid";
import type { Movie } from "@/types/movie";

const mockMovie: Movie = {
  _id: "507f1f77bcf86cd799439011",
  title: "Inception",
  year: 2010,
  runtime: 148,
  genres: ["Action"],
  cast: ["Leonardo DiCaprio"],
  poster: "https://example.com/inception.jpg",
  imdb: { rating: 8.8 },
};

describe("MovieGrid", () => {
  it("renders a grid of movie cards", () => {
    render(<MovieGrid movies={[mockMovie]} />);

    expect(screen.getByRole("heading", { name: "Inception" })).toBeInTheDocument();
  });

  it("shows a search-specific empty state", () => {
    render(<MovieGrid movies={[]} query="zzzznotfound" />);

    expect(screen.getByText("No movies found")).toBeInTheDocument();
    expect(
      screen.getByText('No titles matched "zzzznotfound". Try another search.'),
    ).toBeInTheDocument();
  });

  it("shows a browse empty state when no query is provided", () => {
    render(<MovieGrid movies={[]} />);

    expect(screen.getByText("No movies found")).toBeInTheDocument();
    expect(
      screen.getByText("No movies are available to display right now."),
    ).toBeInTheDocument();
  });
});
