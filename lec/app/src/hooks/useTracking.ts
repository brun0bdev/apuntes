import { useCallback, useMemo, useState } from 'react';
import { trackingFile } from '../data/tracking';
import { players, teams } from '../data/players';
import { computeEvents, asKind, normalizeHandle, parseHandles } from '../lib/tracking';
import type { TrackingAccount, TrackingEvent, TrackingFile, TrackingKind, TrackingSnapshot } from '../types/tracking';

const STORAGE_KEY = 'scouting2026-tracking';

interface WorkingCopy {
  accounts: TrackingAccount[];
  snapshots: TrackingSnapshot[];
}

const TEAM_IDS = new Set(teams.map((t) => t.id));
const PLAYER_IDS = new Set(players.map((p) => p.id));

function sanitizeAccounts(raw: unknown): TrackingAccount[] {
  if (!Array.isArray(raw)) return [];
  const out: TrackingAccount[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const a = item as Partial<TrackingAccount>;
    if (typeof a.id !== 'string' || typeof a.handle !== 'string') continue;
    out.push({
      id: a.id,
      handle: normalizeHandle(a.handle),
      kind: asKind(a.kind, 'other'),
      playerId: typeof a.playerId === 'string' && PLAYER_IDS.has(a.playerId) ? a.playerId : null,
      teamId: typeof a.teamId === 'string' && TEAM_IDS.has(a.teamId) ? a.teamId : null,
      notes: typeof a.notes === 'string' ? a.notes : '',
    });
  }
  return out;
}

function sanitizeSnapshots(raw: unknown): TrackingSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: TrackingSnapshot[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const s = item as Partial<TrackingSnapshot>;
    if (typeof s.id !== 'string' || typeof s.accountId !== 'string' || typeof s.date !== 'string') continue;
    const handles = Array.isArray(s.following) ? s.following.filter((h): h is string => typeof h === 'string') : [];
    out.push({ id: s.id, accountId: s.accountId, date: s.date, following: handles.map(normalizeHandle) });
  }
  return out;
}

function sanitizeCopy(raw: unknown): WorkingCopy {
  if (typeof raw === 'object' && raw !== null && 'accounts' in (raw as object)) {
    const obj = raw as { accounts?: unknown; snapshots?: unknown };
    return { accounts: sanitizeAccounts(obj.accounts), snapshots: sanitizeSnapshots(obj.snapshots) };
  }
  return { accounts: [], snapshots: [] };
}

function loadInitial(): WorkingCopy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitizeCopy(JSON.parse(raw));
  } catch {
    // localStorage bloqueado: se trabaja en memoria.
  }
  return {
    accounts: sanitizeAccounts(trackingFile.accounts),
    snapshots: sanitizeSnapshots(trackingFile.snapshots),
  };
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Registro de cuentas de X y sus snapshots de seguidos. La base editable es
 * data/tracking.json; la copia de trabajo vive en localStorage y se exporta
 * con el mismo formato para commitearla.
 */
export function useTracking() {
  const [copy, setCopy] = useState<WorkingCopy>(loadInitial);
  const { accounts, snapshots } = copy;

  const persist = useCallback((next: WorkingCopy) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sin almacenamiento: cambios solo en memoria.
    }
  }, []);

  const addAccount = useCallback(
    (input: { handle: string; kind: TrackingKind; playerId: string | null; teamId: string | null; notes: string }) => {
      const handle = normalizeHandle(input.handle);
      if (!handle) return false;
      setCopy((current) => {
        if (current.accounts.some((a) => normalizeHandle(a.handle) === handle)) return current;
        const next = {
          ...current,
          accounts: [
            ...current.accounts,
            { id: newId('acc'), handle, kind: input.kind, playerId: input.playerId, teamId: input.teamId, notes: input.notes },
          ],
        };
        persist(next);
        return next;
      });
      return true;
    },
    [persist],
  );

  const removeAccount = useCallback(
    (accountId: string) => {
      setCopy((current) => {
        const next = {
          accounts: current.accounts.filter((a) => a.id !== accountId),
          snapshots: current.snapshots.filter((s) => s.accountId !== accountId),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Añade un snapshot con la lista de seguidos pegada (texto libre). */
  const addSnapshot = useCallback(
    (accountId: string, date: string, pastedText: string) => {
      const following = parseHandles(pastedText);
      if (following.length === 0) return false;
      setCopy((current) => {
        const next = {
          ...current,
          snapshots: [
            ...current.snapshots,
            { id: newId('snap'), accountId, date, following },
          ],
        };
        persist(next);
        return next;
      });
      return true;
    },
    [persist],
  );

  const removeSnapshot = useCallback(
    (snapshotId: string) => {
      setCopy((current) => {
        const next = { ...current, snapshots: current.snapshots.filter((s) => s.id !== snapshotId) };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Borra cuentas y snapshots (vuelve a data/tracking.json). */
  const reset = useCallback(() => {
    setCopy({ accounts: sanitizeAccounts(trackingFile.accounts), snapshots: sanitizeSnapshots(trackingFile.snapshots) });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nada que limpiar
    }
  }, []);

  const events = useMemo<TrackingEvent[]>(() => computeEvents(copy as TrackingFile), [copy]);

  const exportJson = useCallback(() => {
    const payload: TrackingFile = { accounts, snapshots };
    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tracking.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [accounts, snapshots]);

  return { accounts, snapshots, events, addAccount, removeAccount, addSnapshot, removeSnapshot, reset, exportJson };
}
