import { createClient } from "./supabase/client";

export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

export async function submitScore({
  game,
  score,
  name,
}: {
  game: string;
  score: number;
  name: string;
}): Promise<SubmitScoreResult> {
  const cleanName = name.trim();
  if (cleanName.length < 1 || cleanName.length > 10) {
    return { ok: false, error: "Escribe un nombre de 1 a 10 caracteres." };
  }
  try {
    const { error } = await createClient()
      .from("scores")
      .insert({ game_id: game, name: cleanName, score: Math.floor(score) });
    if (error) {
      return {
        ok: false,
        error: "No se pudo guardar la puntuación. Reintenta.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Sin conexión. Revisa tu red y reintenta.",
    };
  }
}
