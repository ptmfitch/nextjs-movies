import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MovieCard } from "@/components/MovieCard";
import type { Movie } from "@/types/movie";

const mockMovie: Movie = {
  _id: "507f1f77bcf86cd799439011",
  plot: "A thief who steals secrets through dreams.",
  genres: ["Action", "Sci-Fi"],
  runtime: 148,
  cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page"],
  poster: "https://example.com/inception.jpg",
  title: "Inception",
  languages: ["English"],
  released: new Date("2010-07-16"),
  directors: ["Christopher Nolan"],
  rated: "PG-13",
  awards: { wins: 4, nominations: 4, text: "Won 4 Oscars." },
  lastupdated: "2015-08-23 00:03:42",
  year: 2010,
  imdb: { rating: 8.8, votes: 2000000, id: 1375666 },
  countries: ["USA", "UK"],
  type: "movie",
  tomatoes: {
    viewer: { rating: 4.5, numReviews: 25000, meter: 87 },
    fresh: 250,
    critic: { rating: 8.5, numReviews: 300, meter: 91 },
    rotten: 25,
    lastUpdated: new Date("2010-07-16"),
  },
  num_mflix_comments: 0,
};

describe("MovieCard", () => {
  it("renders title, year, and rating", () => {
    render(<MovieCard movie={mockMovie} />);

    expect(screen.getByRole("heading", { name: "Inception" })).toBeInTheDocument();
    expect(screen.getByText(/2010/)).toBeInTheDocument();
    expect(screen.getByText("8.8")).toBeInTheDocument();
  });
});
