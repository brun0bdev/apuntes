import { getAgent, getTeam } from '../data/players';
import type { Player } from '../types/player';
import { ROLE_ORDER } from './roles';

export type SortKey = 'contractEnd' | 'name' | 'team' | 'role' | 'agent' | 'nationality';
export type SortDir = 'asc' | 'desc';

export const SORT_KEYS: ReadonlyArray<SortKey> = [
  'contractEnd',
  'name',
  'team',
  'role',
  'agent',
  'nationality',
];

/** Orden por defecto de la tabla: fin de contrato ascendente (PLAN.md §4). */
export const DEFAULT_SORT_KEY: SortKey = 'contractEnd';

/**
 * Valor de ordenación de cada columna. null = dato desconocido (fecha vacía,
 * sin agente, sin nacionalidad): se ordena SIEMPRE al final, en ambas direcciones.
 */
function sortValue(player: Player, key: SortKey): string | null {
  switch (key) {
    case 'contractEnd':
      return player.contractEnd;
    case 'name':
      return player.name;
    case 'team':
      return getTeam(player.teamId)?.name ?? null;
    case 'role': {
      // Los roles se ordenan por su orden canónico, no alfabéticamente.
      const index = ROLE_ORDER.indexOf(player.role);
      return index === -1 ? null : String(index).padStart(2, '0');
    }
    case 'agent':
      return getAgent(player.agentId)?.name ?? null;
    case 'nationality':
      return player.nationality;
  }
}

/**
 * Ordenación estable de la tabla. Los unknown van al final siempre; los empates
 * se resuelven por nombre ascendente para que el orden sea determinista (hay
 * decenas de contratos que vencen el mismo día).
 */
export function sortPlayers(list: Player[], key: SortKey, dir: SortDir): Player[] {
  return [...list].sort((a, b) => {
    const valueA = sortValue(a, key);
    const valueB = sortValue(b, key);

    if (valueA === null && valueB === null) {
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    }
    if (valueA === null) return 1;
    if (valueB === null) return -1;

    const comparison = valueA.localeCompare(valueB, 'es', { sensitivity: 'base', numeric: true });
    if (comparison !== 0) return dir === 'desc' ? -comparison : comparison;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
}
