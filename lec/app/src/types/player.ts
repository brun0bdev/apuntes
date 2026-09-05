/** Ligas representadas en la app (fuente: pestañas del Sheet). */
export type League = 'lec' | 'lcs';

/** Roles canónicos del proyecto (nombres en inglés esports, según PLAN.md §3). */
export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'coach';

/** Estado del contrato tal y como viene del pipeline de datos (nunca derivado). */
export type ContractStatus = 'active' | 'free_agent' | 'unknown' | 'retired';

/** Etapa histórica de un jugador (dato manual, fuente GCD). */
export interface TeamHistoryEntry {
  team: string;
  years: string;
}

/**
 * Una fila de data/players.json (generado por scripts/build-data.mjs a partir
 * del Sheet + overrides.json). Las fechas son ISO yyyy-mm-dd o null.
 */
export interface Player {
  id: string;
  name: string;
  realName: string;
  /** Liga de la persona: 'lec' (pestaña EMEA) o 'lcs' (pestaña Americas). */
  league: League;
  teamId: string;
  role: Role;
  isCoach: boolean;
  /** Código de país (p. ej. "DK"); null mientras no lo rellenen los overrides. */
  nationality: string | null;
  contractEnd: string | null;
  contractStatus: ContractStatus;
  /** FK a data/agents.json; null si no hay dato manual. */
  agentId: string | null;
  /** Ruta bajo public/ (p. ej. "assets/players/caps.webp"); null → avatar de iniciales. */
  photo: string | null;
  /**
   * Nota AJUSTADA de la temporada 2026 (score de scripts/fetch-ratings.mjs:
   * shrinkage bayesiano por partidas + ajuste por % de victorias); es la que
   * se ordena y muestra. null si no hay dato.
   */
  rating: number | null;
  /** Nota CRUDA de esportstransfer.com (0-10) antes del ajuste; null si no hay dato. */
  ratingBase: number | null;
  /** Partidas oficiales en 2026 que respaldan la nota; null si no hay dato. */
  games: number | null;
  /** % de victorias en 2026 como fracción 0-1 (54% → 0.54); null si no hay dato. */
  winRate: number | null;
  teamHistory: TeamHistoryEntry[];
  sourceUrl: string | null;
  notes: string;
}

/** Una fila de data/teams.json: lista canónica de equipos sacada del Sheet. */
export interface Team {
  id: string;
  name: string;
  slug: string;
  abbreviation: string;
  /** Liga del equipo: 'lec' o 'lcs'. */
  league: League;
  /** Ruta bajo public/ (p. ej. "assets/teams/g2.webp"); null si falta el asset. */
  logo: string | null;
  /** Logo monocromático: "dark" (negro, invertir en dark) o "light" (blanco, invertir en light). */
  mono: 'dark' | 'light' | null;
  /** Color de marca del equipo (hex) para acentos de tarjeta y cabecera. */
  color: string;
}

export type AgentType = 'agent' | 'agency';

/** Una fila de data/agents.json: índice derivado de overrides.json. */
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  website: string | null;
  /** Clientes representados (ids de Player); el filtro de agente ordena por nº de clientes desc. */
  playerIds: string[];
}

/**
 * Jugador importado desde Leaguepedia (búsqueda en vivo de la vista 2027).
 * No está en players.json: vive en projections.json/localStorage. Su contrato
 * se desconoce por esta vía, así que cae al pool por defecto.
 */
export interface ImportedPlayer {
  /** id único con prefijo "ext-" para no colisionar con players.json. */
  id: string;
  name: string;
  realName: string | null;
  role: Role;
  /** Equipo de procedencia como texto libre (su liga no está en teams.json). */
  originTeamName: string | null;
  /** Fecha de fin de contrato si el infobox la declara ("Contract Expires"). */
  contractEnd: string | null;
  /** URL absoluta de la foto en static.wikia.nocookie.net (hotlink). */
  photoUrl: string | null;
  /** Página de Leaguepedia de la que se tomaron los datos. */
  sourceUrl: string;
}

/**
 * data/projections.json — asignaciones manuales para el roster proyectado 2027
 * (vista "2027"). Editable a mano o desde la app (botón Exportar JSON); la app
 * además guarda una copia de trabajo en localStorage.
 */
export interface ProjectionsFile {
  updatedAt: string | null;
  /** playerId → teamId asignado para 2027; null = explícitamente sin equipo. */
  assignments: Record<string, string | null>;
  /** Jugadores añadidos por búsqueda en Leaguepedia. */
  imports?: ImportedPlayer[];
}
