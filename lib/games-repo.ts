import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import type { Accent, Category, Game, ScoreRow } from "./types";

interface GameRow {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: Accent;
}

interface StatsRow {
  game_id: string;
  best: number;
  plays: number;
}

interface ScoreDbRow {
  name: string;
  score: number;
  created_at: string;
}

const GAME_COLUMNS = "id, title, short, long, cat, cover, color";

// 0 → "0", 999 → "999", 1200 → "1.2K", 12400 → "12.4K", 1500000 → "1.5M"
export function formatPlays(n: number): string {
  if (n < 1000) return String(n);
  const k = (n / 1000).toFixed(1);
  if (n < 1_000_000 && Number(k) < 1000) return `${k}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

// created_at (ISO, UTC) → "DD/MM/AAAA"
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function toGame(row: GameRow, stats?: StatsRow): Game {
  return {
    ...row,
    best: stats?.best ?? 0,
    plays: formatPlays(stats?.plays ?? 0),
  };
}

const db = async () => createClient(await cookies());

export const getGames = cache(async (): Promise<Game[]> => {
  const supabase = await db();
  const [games, stats] = await Promise.all([
    supabase.from("games").select(GAME_COLUMNS).order("sort"),
    supabase.from("game_stats").select("game_id, best, plays"),
  ]);
  if (games.error) throw new Error(games.error.message);
  if (stats.error) throw new Error(stats.error.message);

  const byGame = new Map((stats.data as StatsRow[]).map((s) => [s.game_id, s]));
  return (games.data as GameRow[]).map((g) => toGame(g, byGame.get(g.id)));
});

export const getGame = cache(async (id: string): Promise<Game | null> => {
  const supabase = await db();
  const [game, stats] = await Promise.all([
    supabase.from("games").select(GAME_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("game_stats")
      .select("game_id, best, plays")
      .eq("game_id", id)
      .maybeSingle(),
  ]);
  if (game.error) throw new Error(game.error.message);
  if (stats.error) throw new Error(stats.error.message);
  if (!game.data) return null;
  return toGame(
    game.data as GameRow,
    (stats.data as StatsRow | null) ?? undefined,
  );
});

export const getLeaderboard = cache(
  async (gameId: string, limit = 12): Promise<ScoreRow[]> => {
    const supabase = await db();
    const { data, error } = await supabase
      .from("scores")
      .select("name, score, created_at")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as ScoreDbRow[]).map((r, i) => ({
      rank: i + 1,
      name: r.name,
      score: r.score,
      date: formatDate(r.created_at),
    }));
  },
);
