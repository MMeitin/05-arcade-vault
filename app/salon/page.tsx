import { notFound } from "next/navigation";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames, getLeaderboard } from "@/lib/games-repo";

export default async function SalonPage(props: PageProps<"/salon">) {
  const { juego } = await props.searchParams;
  const games = await getGames();
  if (games.length === 0) notFound();

  // ?juego desconocido o repetido → primer juego del catálogo
  const id = typeof juego === "string" ? juego : undefined;
  const active = games.find((g) => g.id === id) ?? games[0];
  const rows = await getLeaderboard(active.id, 12);

  return <HallOfFame games={games} active={active} rows={rows} />;
}
