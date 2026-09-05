import { useCallback, useState } from 'react';
import { players } from '../data/players';

/**
 * Asignaciones de agente/agencia hechas desde la ficha de jugador para gente
 * SIN representante (dato manual que vive en data/overrides.json). Mismo
 * patrón que las proyecciones 2027: copia de trabajo en localStorage y
 * exportación a JSON para pegar las entradas en overrides.json y commitear.
 *
 * El JSON exportado es un PARCHE con la forma de overrides.json:
 *   { updatedAt, players: { <id>: { agent, agency } } }
 * (solo entradas con contenido; overrides.json sigue siendo la fuente).
 */

export interface AgentAssignment {
  agent?: string;
  agency?: string;
}

const STORAGE_KEY = 'scouting-agent-assignments';
const PLAYER_IDS = new Set(players.map((p) => p.id));

function sanitize(raw: unknown): Record<string, AgentAssignment> {
  const out: Record<string, AgentAssignment> = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [playerId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!PLAYER_IDS.has(playerId) || typeof value !== 'object' || value === null) continue;
    const v = value as Partial<AgentAssignment>;
    const agent = typeof v.agent === 'string' ? v.agent.trim() : '';
    const agency = typeof v.agency === 'string' ? v.agency.trim() : '';
    if (!agent && !agency) continue; // entrada vacía: fuera
    out[playerId] = { ...(agent ? { agent } : {}), ...(agency ? { agency } : {}) };
  }
  return out;
}

function loadInitial(): Record<string, AgentAssignment> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch {
    // localStorage bloqueado (p. ej. modo privado): se trabaja solo en memoria.
  }
  return {};
}

export function useAgentAssignments() {
  const [assignments, setAssignments] = useState<Record<string, AgentAssignment>>(loadInitial);

  const persist = useCallback((next: Record<string, AgentAssignment>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ players: next }));
    } catch {
      // sin almacenamiento: los cambios viven solo en memoria.
    }
  }, []);

  /** Guarda (o sobrescribe) la asignación de agente/agencia de un jugador. */
  const assign = useCallback(
    (playerId: string, value: AgentAssignment) => {
      const agent = value.agent?.trim();
      const agency = value.agency?.trim();
      if (!agent && !agency) return;
      setAssignments((current) => {
        const next = { ...current, [playerId]: { ...(agent ? { agent } : {}), ...(agency ? { agency } : {}) } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Quita la asignación local: el jugador vuelve a mostrarse sin agente. */
  const clear = useCallback(
    (playerId: string) => {
      setAssignments((current) => {
        if (!(playerId in current)) return current;
        const next = { ...current };
        delete next[playerId];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const count = Object.keys(assignments).length;

  /**
   * Descarga el parche con la forma de overrides.json (solo las entradas
   * locales) para pegar en data/overrides.json y commitear.
   */
  const exportJson = useCallback(() => {
    const payload = {
      updatedAt: new Date().toISOString(),
      players: assignments,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'overrides-agentes.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [assignments]);

  return { assignments, assign, clear, count, exportJson };
}
