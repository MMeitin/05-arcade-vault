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

export interface Feature {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: Accent;
}

export interface HomeStat {
  n: string;
  unit: string;
  sub: string;
}

export interface RecentScore {
  player: string;
  game: string;
  score: number;
  when: string; // "hace 2 min"
  color: Accent;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface ContactInput {
  name: string; // 1–60 chars, trim
  email: string; // email válido, máx 120
  message: string; // 1–2000 chars, trim
}

export type ContactField = keyof ContactInput;

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | {
      status: "error";
      fieldErrors?: Partial<Record<ContactField, string>>;
      formError?: string;
      values: ContactInput; // para repoblar el form
    };

export interface GameCanvasProps {
  paused: boolean; // el reproductor manda; el motor se congela si true
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void; // una sola vez por partida
  onAutoPause: () => void; // pérdida de foco / pestaña oculta
}
