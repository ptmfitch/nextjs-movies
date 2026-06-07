export interface MovieImdb {
  rating: number;
}

export interface Movie {
  _id: string;
  title: string;
  year: number;
  runtime: number;
  genres: string[];
  cast: string[];
  poster: string;
  imdb: MovieImdb;
}

export interface MovieDocument {
  _id: { toString(): string };
  title?: string;
  year?: number | string;
  runtime?: number;
  genres?: string[];
  cast?: string[];
  poster?: string;
  imdb?: { rating?: number | string };
}
