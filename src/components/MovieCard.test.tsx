import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MovieCard } from "@/components/MovieCard";
import type { Movie } from "@/types/movie";

const mockMovie: Movie = {
  _id: "507f1f77bcf86cd799439011",
  genres: ["Action", "Sci-Fi"],
  runtime: 148,
  cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page"],
  poster: "https://example.com/inception.jpg",
  title: "Inception",
  year: 2010,
  imdb: { rating: 8.8 },
};

describe("MovieCard", () => {
  it("renders title, year, rating, and poster", () => {
    render(<MovieCard movie={mockMovie} />);

    expect(screen.getByRole("heading", { name: "Inception" })).toBeInTheDocument();
    expect(screen.getByText(/2010/)).toBeInTheDocument();
    expect(screen.getByText("8.8")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Inception poster" })).toHaveAttribute(
      "src",
      mockMovie.poster,
    );
  });
});
