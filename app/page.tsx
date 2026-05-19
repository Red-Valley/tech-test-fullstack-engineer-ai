import { getGamesRepository } from "@/lib/games/repository";
import GamesView from "@/components/games/games-view";

export default function HomePage() {
  const games = getGamesRepository().list();
  return <GamesView games={games} />;
}
