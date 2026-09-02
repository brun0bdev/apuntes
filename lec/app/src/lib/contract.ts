import type { Player } from '../types/player';

/**
 * Estado derivado del contrato para la UI (badges, orden de tabla, filtro 2026).
 * Es una regla de presentación: NUNCA se escribe en data/players.json.
 */
export type ContractState = 'expiring2026' | 'long' | 'free_agent' | 'unknown' | 'retired';

/** Regla de PLAN.md §3: contrato activo cuya fecha termina en el año 2026. */
export function terminaEn2026(player: Player): boolean {
  return player.contractStatus === 'active' && player.contractEnd?.slice(0, 4) === '2026';
}

/**
 * Mapa ContractStatus + contractEnd → estado de badge:
 * - expiring2026: activo y termina en 2026 (chip ámbar).
 * - long: activo con fecha ≥ 2027 (punto verde discreto).
 * - free_agent / retired: tal cual (rojo / gris).
 * - unknown: activo sin fecha válida (o estado desconocido) → gris.
 */
export function contractState(player: Player): ContractState {
  switch (player.contractStatus) {
    case 'retired':
      return 'retired';
    case 'free_agent':
      return 'free_agent';
    case 'unknown':
      return 'unknown';
    case 'active': {
      if (terminaEn2026(player)) return 'expiring2026';
      const year = player.contractEnd?.slice(0, 4);
      // Los años ISO de 4 dígitos comparan bien como string ("2027" > "2026").
      if (year !== undefined && year >= '2027') return 'long';
      return 'unknown';
    }
  }
}
