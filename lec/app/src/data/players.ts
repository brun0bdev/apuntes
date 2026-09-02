import playersJson from '../../data/players.json';
import type { Agent, Player, Team } from '../types/player';
import { agents } from './agents';
import { teams } from './teams';

// El JSON lo genera scripts/build-data.mjs; el cast aplica el esquema de PLAN.md §3.
export const players = playersJson as Player[];

// Re-exportados aquí para que la capa de datos tenga un único punto de consumo.
export { teams, agents };

export function getTeam(teamId: string): Team | undefined {
  return teams.find((team) => team.id === teamId);
}

export function getAgent(agentId: string | null): Agent | undefined {
  if (!agentId) return undefined;
  return agents.find((agent) => agent.id === agentId);
}
