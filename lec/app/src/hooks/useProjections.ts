import { useCallback, useMemo, useState } from 'react';
import { projectionsFile } from '../data/projections';
import { players, teams } from '../data/players';
import type { ImportedPlayer, Player, ProjectionsFile } from '../types/player';

export type Assignments = Record<string, string | null>;

/** Estado resuelto de un jugador para 2027. */
export interface Projection27 {
  /** Equipo asignado para 2027; null = sin equipo (pool de agentes libres). */
  teamId: string | null;
  /** Tiene asignación manual (pisa la regla por defecto). */
  hasOverride: boolean;
  /** La asignación difiere del por defecto (por contrato). */
  moved: boolean;
  /** Equipo por defecto según contrato (null = agente libre al expirar). */
  originTeamId: string | null;
}

const STORAGE_KEY = 'scouting2027-projections';
const PLAYER_IDS = new Set(players.map((p) => p.id));
const TEAM_IDS = new Set(teams.map((t) => t.id));

interface WorkingCopy {
  assignments: Assignments;
  imports: ImportedPlayer[];
}

/** Contrato vigente más allá de 2026 (ISO yyyy-mm-dd compara lexicográficamente). */
export function isSignedBeyond2026(p: Player): boolean {
  return p.contractStatus === 'active' && p.contractEnd !== null && p.contractEnd >= '2027-01-01';
}

/** Equipo por defecto para 2027: el actual si sigue contratado; pool si expira en 2026. */
export function defaultTeam27(p: Player): string | null {
  return isSignedBeyond2026(p) ? p.teamId : null;
}

function sanitizeAssignments(raw: unknown): Assignments {
  const out: Assignments = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [playerId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!PLAYER_IDS.has(playerId)) continue;
    if (value === null) out[playerId] = null;
    else if (typeof value === 'string' && TEAM_IDS.has(value)) out[playerId] = value;
  }
  return out;
}

/**
 * Los importados no pasan la validación por PLAYER_IDS/TEAM_IDS (no existen en
 * players.json/teams.json): solo se comprueba su forma. La asignación de un
 * importado apunta a teamId reales y se valida en sanitizeAssignments.
 */
function sanitizeImports(raw: unknown): ImportedPlayer[] {
  if (!Array.isArray(raw)) return [];
  const out: ImportedPlayer[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const i = item as Partial<ImportedPlayer>;
    if (typeof i.id !== 'string' || !i.id.startsWith('ext-')) continue;
    if (typeof i.name !== 'string' || !i.name) continue;
    out.push({
      id: i.id,
      name: i.name,
      role: (i.role ?? 'mid') as ImportedPlayer['role'],
      realName: typeof i.realName === 'string' ? i.realName : null,
      originTeamName: typeof i.originTeamName === 'string' ? i.originTeamName : null,
      contractEnd: typeof i.contractEnd === 'string' ? i.contractEnd : null,
      photoUrl: typeof i.photoUrl === 'string' ? i.photoUrl : null,
      sourceUrl: typeof i.sourceUrl === 'string' ? i.sourceUrl : '',
    });
  }
  return out;
}

function sanitizeCopy(raw: unknown): WorkingCopy {
  // Formato v2: { assignments, imports }. Formato v1 (solo mapa) sigue cargando.
  if (typeof raw === 'object' && raw !== null && 'assignments' in (raw as object)) {
    const obj = raw as { assignments?: unknown; imports?: unknown };
    return { assignments: sanitizeAssignments(obj.assignments), imports: sanitizeImports(obj.imports) };
  }
  return { assignments: sanitizeAssignments(raw), imports: [] };
}

/** Copia de trabajo base: localStorage del navegador o, si no hay, data/projections.json. */
function loadBaseCopy(): WorkingCopy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitizeCopy(JSON.parse(raw));
  } catch {
    // localStorage bloqueado (p. ej. modo privado): se trabaja solo en memoria.
  }
  return {
    assignments: sanitizeAssignments(projectionsFile.assignments),
    imports: sanitizeImports(projectionsFile.imports ?? []),
  };
}

/**
 * Parsea el parámetro `?proj=` (formato `id:team,id2:_`, con `_` = sin equipo).
 * Las entradas con id o equipo desconocidos se saltan; devuelve null si no hay
 * ninguna válida, para caer a la fuente inferior (localStorage / JSON base).
 */
export function parseProjParam(raw: string | null): Assignments | null {
  if (!raw) return null;
  const out: Assignments = {};
  for (const entry of raw.split(',')) {
    if (!entry) continue;
    const sep = entry.indexOf(':');
    if (sep === -1) continue;
    const playerId = entry.slice(0, sep);
    const teamValue = entry.slice(sep + 1);
    if (!PLAYER_IDS.has(playerId)) continue;
    if (teamValue === '_') out[playerId] = null;
    else if (TEAM_IDS.has(teamValue)) out[playerId] = teamValue;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function loadInitial(): WorkingCopy {
  // Prioridad máxima: asignaciones compartidas por URL (`?proj=`) — así quien
  // recibe el enlace ve la proyección tal cual se compartió. Luego localStorage
  // y, por último, la base commiteada data/projections.json.
  const fromUrl = parseProjParam(new URLSearchParams(window.location.search).get('proj'));
  if (fromUrl) return { assignments: fromUrl, imports: [] };
  return loadBaseCopy();
}

/**
 * Serializa las asignaciones para el parámetro `?proj=` de un enlace
 * compartible: solo overrides reales del roster base (los importados `ext-` no
 * viajan, quien abre el enlace no los tiene) y omitiendo lo que coincide con el
 * equipo por defecto por contrato. Formato: `id:team`, `_` para sin equipo,
 * unido por comas — p. ej. `proj=caps:kc,brokenblade:_`. Devuelve '' si no hay
 * nada que compartan.
 */
export function serializeProjParam(assignments: Assignments): string {
  const byId = new Map(players.map((p) => [p.id, p]));
  const parts: string[] = [];
  for (const [playerId, teamId] of Object.entries(assignments)) {
    const player = byId.get(playerId);
    if (!player) continue; // ext- y desconocidos no viajan en el enlace
    if (teamId === defaultTeam27(player)) continue;
    parts.push(teamId === null ? `${playerId}:_` : `${playerId}:${teamId}`);
  }
  return parts.join(',');
}

/** Convierte un importado a Player para reutilizar toda la maquinaria de la vista. */
export function importedToPlayer(i: ImportedPlayer): Player {
  return {
    id: i.id,
    name: i.name,
    realName: i.realName ?? '',
    // Los importados de Leaguepedia no tienen liga en la app: viven solo en
    // el pool y en las columnas visibles de la liga activa (no pasan el filtro).
    league: 'lec' as const,
    // '' = sin equipo en teams.json; getTeam('') da undefined en toda la app.
    teamId: '',
    role: i.role,
    isCoach: false,
    nationality: null,
    contractEnd: i.contractEnd,
    contractStatus: i.contractEnd ? 'active' : 'unknown',
    agentId: null,
    photo: i.photoUrl,
    rating: null,
    ratingBase: null,
    games: null,
    winRate: null,
    teamHistory: [],
    sourceUrl: i.sourceUrl,
    notes: 'Importado de Leaguepedia',
  };
}

/**
 * Asignaciones del roster 2027: por defecto cada jugador sigue en su equipo si
 * su contrato va más allá de 2026 y cae al pool de libres si expira; cualquier
 * override del usuario (drag & drop o clic) se persiste en localStorage y se
 * puede exportar como data/projections.json para commitearlo. Incluye los
 * jugadores importados desde Leaguepedia.
 */
export function useProjections() {
  const [copy, setCopy] = useState<WorkingCopy>(loadInitial);
  const { assignments, imports } = copy;

  const persist = useCallback((next: WorkingCopy) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sin almacenamiento: los cambios viven solo en memoria.
    }
  }, []);

  /** Asigna un jugador a un equipo (o null = sin equipo) para 2027. */
  const move = useCallback(
    (playerId: string, teamId: string | null) => {
      setCopy((current) => {
        const next = { ...current, assignments: { ...current.assignments, [playerId]: teamId } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Quita el override: el jugador vuelve a su posición por defecto. */
  const revert = useCallback(
    (playerId: string) => {
      setCopy((current) => {
        if (!(playerId in current.assignments)) return current;
        const assignments = { ...current.assignments };
        delete assignments[playerId];
        const next = { ...current, assignments };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Añade un jugador importado de Leaguepedia (deduplicado por id). */
  const addImport = useCallback(
    (imported: ImportedPlayer) => {
      setCopy((current) => {
        if (current.imports.some((i) => i.id === imported.id)) return current;
        const next = { ...current, imports: [...current.imports, imported] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Elimina un importado (y su asignación si la tuviera). */
  const removeImport = useCallback(
    (importedId: string) => {
      setCopy((current) => {
        const assignments = { ...current.assignments };
        delete assignments[importedId];
        const next = {
          assignments,
          imports: current.imports.filter((i) => i.id !== importedId),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Borra todas las asignaciones e importados manuales. */
  const reset = useCallback(() => {
    setCopy({ assignments: {}, imports: [] });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nada que limpiar
    }
  }, []);

  const resolve = useCallback(
    (p: Player): Projection27 => {
      const originTeamId = defaultTeam27(p);
      const hasOverride = p.id in assignments;
      const override = assignments[p.id];
      const teamId = hasOverride ? override : originTeamId;
      return {
        teamId,
        hasOverride,
        moved: hasOverride && override !== originTeamId,
        originTeamId,
      };
    },
    [assignments],
  );

  const movementCount = useMemo(() => {
    const all: Player[] = [...players, ...imports.map(importedToPlayer)];
    return all.filter((p) => !p.isCoach && resolve(p).moved).length;
  }, [resolve, imports]);

  /** Descarga el estado actual como projections.json para commitearlo al repo. */
  const exportJson = useCallback(() => {
    const payload: ProjectionsFile = {
      updatedAt: new Date().toISOString(),
      assignments,
      imports,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'projections.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [assignments, imports]);

  return { assignments, imports, resolve, move, revert, addImport, removeImport, reset, movementCount, exportJson };
}
