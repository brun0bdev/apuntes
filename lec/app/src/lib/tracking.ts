import type { TrackingAccount, TrackingEvent, TrackingFile, TrackingKind } from '../types/tracking';
import { defaultTeam27 } from '../hooks/useProjections';
import type { Player } from '../types/player';

/** Normaliza un handle: sin @, minúsculas, sin espacios. */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Extrae handles de texto pegado desde X (separados por espacios, saltos,
 * comas o punto y coma; con o sin @). Solo handles válidos de X (1-15,
 * [a-z0-9_]).
 */
export function parseHandles(text: string): string[] {
  const set = new Set<string>();
  for (const part of text.split(/[\s,;]+/)) {
    const handle = normalizeHandle(part);
    if (/^[a-z0-9_]{1,15}$/.test(handle)) set.add(handle);
  }
  return [...set];
}

/**
 * Diffs entre snapshots consecutivos de cada cuenta → eventos follow/unfollow,
 * enriquecidos con el jugador objetivo (si su handle es una cuenta registrada)
 * y marcados como señal cuando tienen valor de scouting:
 *  - follow de un jugador por parte de coach/GM/agencia (la señal clásica de
 *    tryouts/fichaje, sobre todo si el jugador expira en 2026);
 *  - unfollow entre cuentas de jugadores (posible salida/cambio).
 */
export function computeEvents(file: TrackingFile): TrackingEvent[] {
  const accountsByHandle = new Map(file.accounts.map((a) => [normalizeHandle(a.handle), a]));

  const events: TrackingEvent[] = [];

  for (const account of file.accounts) {
    const snapshots = file.snapshots
      .filter((snapshot) => snapshot.accountId === account.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 1; i < snapshots.length; i++) {
      const previous = new Set(snapshots[i - 1].following);
      const current = snapshots[i];
      const following = new Set(current.following);

      for (const handle of following) {
        if (previous.has(handle)) continue;
        events.push(buildEvent(account, current.date, 'follow', handle, accountsByHandle));
      }
      for (const handle of previous) {
        if (following.has(handle)) continue;
        events.push(buildEvent(account, current.date, 'unfollow', handle, accountsByHandle));
      }
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

function buildEvent(
  account: TrackingAccount,
  date: string,
  type: 'follow' | 'unfollow',
  targetHandle: string,
  accountsByHandle: Map<string, TrackingAccount>,
): TrackingEvent {
  const targetAccount = accountsByHandle.get(targetHandle);
  const targetPlayerId =
    targetAccount?.kind === 'player' && targetAccount.playerId ? targetAccount.playerId : null;

  let signal = false;
  let signalReason: TrackingEvent['signalReason'] = null;

  if (type === 'follow' && account.kind !== 'player' && targetPlayerId) {
    signal = true;
    signalReason = 'followPlayer';
  }
  if (type === 'unfollow' && account.kind === 'player' && targetPlayerId && targetPlayerId !== account.playerId) {
    signal = true;
    signalReason = 'unfollowPlayers';
  }

  return {
    id: `${account.id}-${date}-${type}-${targetHandle}`,
    accountId: account.id,
    accountHandle: account.handle,
    kind: account.kind,
    teamId: account.teamId,
    playerId: account.playerId,
    date,
    type,
    targetHandle,
    targetPlayerId,
    signal,
    signalReason,
  };
}

/**
 * Señales priorizadas para el tablón: las que involucran a jugadores del pool
 * 2027 (expiran o sin fecha) o movidas fuera de su equipo actual se ordenan
 * primero; después el resto por fecha.
 */
export function sortEventsForBoard(events: TrackingEvent[], allPlayers: Player[]): TrackingEvent[] {
  const byId = new Map(allPlayers.map((p) => [p.id, p]));
  const hotness = (event: TrackingEvent): number => {
    if (!event.signal || !event.targetPlayerId) return 2;
    const player = byId.get(event.targetPlayerId);
    if (!player) return 2;
    if (defaultTeam27(player) === null) return 0; // expira 2026 / sin fecha: hot
    if (defaultTeam27(player) !== event.teamId && event.teamId) return 1; // staff de otro equipo
    return 2;
  };
  return [...events].sort((a, b) => hotness(a) - hotness(b) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** Verifica que un kind es válido al leer datos externos. */
export function asKind(value: unknown, fallback: TrackingKind): TrackingKind {
  const kinds: TrackingKind[] = ['player', 'coach', 'gm', 'agency', 'other'];
  return typeof value === 'string' && (kinds as string[]).includes(value) ? (value as TrackingKind) : fallback;
}
