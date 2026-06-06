export interface TomatoRating {
  rating: number;
  numReviews: number;
  meter: number;
}

export interface Tomatoes {
  viewer: TomatoRating;
  fresh: number;
  critic: TomatoRating;
  rotten: number;
  lastUpdated: Date;
}

export interface MovieAwards {
  wins: number;
  nominations: number;
  text: string;
}

export interface MovieImdb {
  rating: number;
  votes: number;
  id: number;
}

export interface Movie {
  _id: string;
  plot: string;
  genres: string[];
  runtime: number;
  cast: string[];
  poster: string;
  title: string;
  fullplot?: string;
  languages: string[];
  released: Date;
  directors: string[];
  rated: string;
  awards: MovieAwards;
  lastupdated: string;
  year: number;
  imdb: MovieImdb;
  countries: string[];
  type: string;
  tomatoes: Tomatoes;
  num_mflix_comments: number;
}

export interface MovieDocument {
  _id: { toString(): string };
  plot?: string;
  genres?: string[];
  runtime?: number;
  cast?: string[];
  poster?: string;
  title?: string;
  fullplot?: string;
  languages?: string[];
  released?: Date;
  directors?: string[];
  rated?: string;
  awards?: MovieAwards;
  lastupdated?: string;
  year?: number | string;
  imdb?: MovieImdb;
  countries?: string[];
  type?: string;
  tomatoes?: Tomatoes;
  num_mflix_comments?: number;
}
