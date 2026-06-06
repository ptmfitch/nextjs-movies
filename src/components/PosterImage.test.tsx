import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PosterImage } from "@/components/PosterImage";

describe("PosterImage", () => {
  it("shows a fallback when the image fails to load", () => {
    render(<PosterImage src="https://example.com/missing.jpg" alt="Test poster" />);

    fireEvent.error(screen.getByRole("img", { name: "Test poster" }));

    expect(screen.queryByRole("img", { name: "Test poster" })).not.toBeInTheDocument();
    expect(screen.getByText("Poster unavailable")).toBeInTheDocument();
  });
});
