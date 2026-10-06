export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Accent = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string; // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string; // clase CSS: "cover-bricks", "cover-tetro", ...
  color: Accent;
  best: number;
  plays: string; // "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
}

export interface SessionUser {
  name: string; // máx 10 chars, mayúsculas
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
