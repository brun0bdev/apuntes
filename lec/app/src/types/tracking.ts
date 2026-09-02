/**
 * Modelo del apartado Tracking X (seguimiento de follows/unfollows en X).
 * x.com no ofrece lectura de follows sin API de pago: el flujo es registrar
 * cuentas, guardar snapshots manuales de su lista de seguidos (pegando los
 * handles) y dejar que la app calcule los diffs y las señales offseason.
 */

export type TrackingKind = 'player' | 'coach' | 'gm' | 'agency' | 'other';

export const TRACKING_KINDS: ReadonlyArray<TrackingKind> = [
  'player',
  'coach',
  'gm',
  'agency',
  'other',
];

/** Cuenta vigilada: handle de X + su papel + a quién/qué organización representa. */
export interface TrackingAccount {
  id: string;
  /** Handle sin @ y en minúsculas (clave normalizada). */
  handle: string;
  kind: TrackingKind;
  /** Jugador vinculado (id de players.json o ext- importado) si kind === 'player'. */
  playerId: string | null;
  /** Organización a la que pertenece (equipo LEC) para cuentas de staff. */
  teamId: string | null;
  notes: string;
}

/** Foto de la lista de seguidos de una cuenta en una fecha. */
export interface TrackingSnapshot {
  id: string;
  accountId: string;
  /** ISO yyyy-mm-dd. */
  date: string;
  /** Handles normalizados que seguía la cuenta en esa fecha. */
  following: string[];
}

/** data/tracking.json — base editable a mano y exportable desde la app. */
export interface TrackingFile {
  accounts: TrackingAccount[];
  snapshots: TrackingSnapshot[];
}

/** Follow/unfollow deducido entre dos snapshots consecutivos de una cuenta. */
export interface TrackingEvent {
  id: string;
  accountId: string;
  accountHandle: string;
  kind: TrackingKind;
  teamId: string | null;
  /** Jugador vinculado a la propia cuenta (kind === 'player'), si lo hay. */
  playerId: string | null;
  date: string;
  type: 'follow' | 'unfollow';
  targetHandle: string;
  /** playerId del objetivo si su handle es una cuenta registrada de jugador. */
  targetPlayerId: string | null;
  /** Marca las interacciones con valor de scouting (señal offseason). */
  signal: boolean;
  /** Clave de traducción del motivo (el texto se compone en el componente). */
  signalReason: 'followPlayer' | 'unfollowPlayers' | null;
}
