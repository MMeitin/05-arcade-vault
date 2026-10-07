import type { Metadata } from "next";
import { Library } from "@/components/library";
import { getGames } from "@/lib/games-repo";

export const metadata: Metadata = {
  title: "Biblioteca · Arcade Vault",
  description: "Explora la biblioteca de juegos de Arcade Vault.",
};

export default async function BibliotecaPage() {
  const games = await getGames();
  return <Library games={games} />;
}
