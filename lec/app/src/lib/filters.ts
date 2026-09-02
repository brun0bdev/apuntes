import type { Player, Role, Team } from '../types/player';
import { terminaEn2026 } from './contract';

/** Valor especial del filtro de agente: jugadores sin representante (dato manual pendiente). */
export const NO_AGENT = 'none';

/** Valores de filtro combinables con AND (PLAN.md §4). */
export interface FilterValues {
  /** Búsqueda sobre name + realName; efectiva a partir de 2 caracteres. */
  q: string;
  /** Id de equipo; '' = todos. */
  team: string;
  /** Rol; '' = todos (coaches ocultos salvo selección explícita "Coach"). */
  role: Role | '';
  /** Id de agente, NO_AGENT o '' = todos. */
  agent: string;
  /** Toggle "Solo terminan en 2026". */
  expiring2026: boolean;
}

/** Minúsculas y sin acentos, para que "jose" encuentre "José". */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Búsqueda case-insensitive sobre name y realName; mínimo 2 caracteres. */
export function matchesQuery(player: Player, q: string): boolean {
  const query = normalizeText(q.trim());
  if (query.length < 2) return true;
  return normalizeText(player.name).includes(query) || normalizeText(player.realName).includes(query);
}

/** Coincidencia con el filtro de agente (id concreto o "sin agente"). */
export function agentMatches(player: Player, agent: string): boolean {
  return agent === NO_AGENT ? player.agentId === null : player.agentId === agent;
}

/** Coaches ocultos salvo que el rol seleccionado sea explícitamente "Coach". */
function passesRole(player: Player, role: Role | ''): boolean {
  return role === '' ? !player.isCoach : player.role === role;
}

/** Filtros AND completos: búsqueda + equipo + rol + agente + solo 2026. Vista tabla. */
export function passesFilters(players: Player[], f: FilterValues): Player[] {
  return players.filter(
    (player) =>
      matchesQuery(player, f.q) &&
      (f.team === '' || player.teamId === f.team) &&
      passesRole(player, f.role) &&
      (f.agent === '' || agentMatches(player, f.agent)) &&
      (!f.expiring2026 || terminaEn2026(player)),
  );
}

export interface TeamGroup {
  team: Team;
  /** Jugadores del equipo que pasan búsqueda/rol/2026 (los visibles en la tarjeta). */
  players: Player[];
  /** Ids de clientes del agente activo (borde azul); vacío si el filtro no está activo. */
  highlightedIds: Set<string>;
  /** Contador "N expiran 2026" de la cabecera. */
  expiringCount: number;
  /** Contador "N/M representados" cuando el filtro de agente está activo. */
  clientCount: number;
}

/**
 * Agrupación para la parrilla. Con el filtro de agente activo los equipos NO se
 * ocultan (PLAN.md §4): se muestran todos los que tengan jugadores visibles,
 * resaltando a los clientes y atenuando al resto. Sin filtro de agente, los
 * equipos sin coincidencias se ocultan (comportamiento del resto de filtros).
 */
export function buildGridGroups(
  players: Player[],
  teams: Team[],
  f: FilterValues,
): { groups: TeamGroup[]; matchCount: number } {
  const base = players.filter(
    (player) =>
      matchesQuery(player, f.q) && passesRole(player, f.role) && (!f.expiring2026 || terminaEn2026(player)),
  );
  const agentActive = f.agent !== '';

  const groups: TeamGroup[] = [];
  let matchCount = 0;

  for (const team of teams) {
    if (f.team !== '' && team.id !== f.team) continue;
    const teamPlayers = base.filter((player) => player.teamId === team.id);
    if (teamPlayers.length === 0) continue;

    const clients = agentActive ? teamPlayers.filter((player) => agentMatches(player, f.agent)) : teamPlayers;
    matchCount += clients.length;

    groups.push({
      team,
      players: teamPlayers,
      highlightedIds: new Set(clients.map((player) => player.id)),
      expiringCount: teamPlayers.filter(terminaEn2026).length,
      clientCount: clients.length,
    });
  }

  return { groups, matchCount };
}
