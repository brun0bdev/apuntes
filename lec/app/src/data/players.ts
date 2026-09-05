import playersJson from '../../data/players.json';
import ratingsJson from '../../data/ratings.json';
import type { Agent, Player, Team } from '../types/player';
import { agents } from './agents';
import { teams } from './teams';

// El JSON lo genera scripts/build-data.mjs; el cast aplica el esquema de PLAN.md §3
// salvo la nota, que no vive en players.json (se añade abajo desde ratings.json).
const basePlayers = playersJson as unknown as Omit<Player, 'rating' | 'ratingBase' | 'games' | 'winRate'>[];

// ratings.json lo genera scripts/fetch-ratings.mjs (esportstransfer.com); se
// fusiona aquí para que la nota llegue a toda la app sin tocar el pipeline.
// `score` es la nota ajustada (muestra + contexto) y `rating` la cruda; en el
// Player, `rating` es la ajustada y `ratingBase` la cruda.
const ratings = ratingsJson as {
  updatedAt: string | null;
  players: Record<string, {
    rating: number | null;
    games?: number | null;
    winRate?: number | null;
    score?: number | null;
  }>;
};

export const players: Player[] = basePlayers.map((p) => {
  const entry = ratings.players[p.id];
  return {
    ...p,
    rating: entry?.score ?? entry?.rating ?? null,
    ratingBase: entry?.rating ?? null,
    games: entry?.games ?? null,
    winRate: entry?.winRate ?? null,
  };
});

// Re-exportados aquí para que la capa de datos tenga un único punto de consumo.
export { teams, agents };

export function getTeam(teamId: string): Team | undefined {
  return teams.find((team) => team.id === teamId);
}

export function getAgent(agentId: string | null): Agent | undefined {
  if (!agentId) return undefined;
  return agents.find((agent) => agent.id === agentId);
}
