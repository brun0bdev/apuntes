import { useState, type DragEvent } from 'react';
import { assetUrl } from '../lib/assets';
import { getTeam } from '../data/players';
import { formatDate } from '../lib/format';
import { useI18n } from '../i18n';
import type { Projection27 } from '../hooks/useProjections';
import type { Player, Team } from '../types/player';
import { PlayerPhoto } from './PlayerPhoto';
import { RoleIcon } from './RoleIcon';

/** Ámbito del árbol: jugadores o staff. */
export type Scope = 'players' | 'staff';
/** Clave de drop target: "{scope}:{teamId|pool}". */
export type DropTargetId = string | null;

export interface TeamColumnProps {
  /** Roles jugables que faltan en la proyección (solo scope players): se pintan en rojo. */
  missingRoles?: import('../types/player').Role[];
  scope: Scope;
  team: Team;
  members: Player[];
  dropTarget: DropTargetId;
  selectedId: string | null;
  resolve: (p: Player) => Projection27;
  onSelect: (playerId: string) => void;
  onMove: (playerId: string, teamId: string | null) => void;
  onRevert: (playerId: string) => void;
  onRemoveImport: (importedId: string) => void;
  dragOver: (key: string) => (event: DragEvent) => void;
  dragLeave: (key: string) => (event: DragEvent) => void;
  onDropKey: (key: string) => (event: DragEvent) => void;
  headerClick: (key: string) => void;
}

/** Columna de equipo del árbol (jugadores o staff, según scope). */
export function TeamColumn({
  scope,
  missingRoles,
  team,
  members,
  dropTarget,
  selectedId,
  resolve,
  onSelect,
  onMove,
  onRevert,
  onRemoveImport,
  dragOver,
  dragLeave,
  onDropKey,
  headerClick,
}: TeamColumnProps) {
  const { t } = useI18n();
  const key = `${scope}:${team.id}`;
  const isDrop = dropTarget === key;

  return (
    <div
      onDragOver={dragOver(key)}
      onDragLeave={dragLeave(key)}
      onDrop={onDropKey(key)}
      className={`flex flex-col gap-2 ${isDrop ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas' : ''}`}
    >
      <button
        type="button"
        onClick={() => headerClick(key)}
        aria-label={
          selectedId
            ? t('r27.moveSelectedAria', { name: team.name })
            : t('r27.teamAria', { name: team.name, count: members.length })
        }
        className="block w-full border border-hairline bg-card text-left"
      >
        <span className="flex items-center gap-2.5 px-2.5 py-2">
          <TeamLogo team={team} />
          <span className="min-w-0 flex-1 truncate text-body-sm font-bold uppercase text-ink">
            {team.name}
          </span>
          {scope === 'players' && missingRoles && missingRoles.length > 0 && (
            <span
              className="flex shrink-0 items-center gap-1"
              aria-label={t('r27.missingRolesAria')}
              title={t('r27.missingRolesAria')}
            >
              {missingRoles.map((role) => (
                <RoleIcon key={role} role={role} size={14} className="role-icon--missing" />
              ))}
            </span>
          )}
          {scope === 'players' && missingRoles && missingRoles.length === 0 && (
            <span className="shrink-0 text-caption font-semibold text-success" title={t('r27.rosterComplete')}>✓</span>
          )}
        </span>
        <span className="block h-1" style={{ background: team.color }} aria-hidden="true" />
      </button>

      <ul className="ml-4 flex flex-col gap-1.5 border-l-2 border-l-hairline-strong pl-2">
        {members.map((player) => (
          <MemberNode
            key={player.id}
            player={player}
            teamId={team.id}
            info={resolve(player)}
            selected={selectedId === player.id}
            onSelect={onSelect}
            onSendToPool={() => onMove(player.id, null)}
            onRevert={() => onRevert(player.id)}
            onRemoveImport={onRemoveImport}
          />
        ))}
        {members.length === 0 && <li className="text-caption text-muted">{t('r27.emptyTeam')}</li>}
      </ul>
    </div>
  );
}

export function TeamLogo({ team }: { team: Team }) {
  const [failed, setFailed] = useState(false);
  if (!team.logo || failed) {
    return <span className="text-caption font-bold uppercase text-muted">{team.abbreviation}</span>;
  }
  return (
    <img
      src={assetUrl(team.logo)}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-6 w-6 shrink-0 object-contain ${team.mono ? `team-logo--mono-${team.mono}` : ''}`}
    />
  );
}

export interface MemberNodeProps {
  player: Player;
  /** Equipo bajo el que se renderiza el nodo (destino actual para 2027). */
  teamId: string;
  info: Projection27;
  selected: boolean;
  onSelect: (playerId: string) => void;
  onSendToPool: () => void;
  onRevert: () => void;
  onRemoveImport: (importedId: string) => void;
}

/** Nodo hijo de un equipo en el árbol: foto, nombre, rol, estado y acciones. */
export function MemberNode({ player, teamId, info, selected, onSelect, onSendToPool, onRevert, onRemoveImport }: MemberNodeProps) {
  const { t } = useI18n();
  const origin = info.originTeamId ? getTeam(info.originTeamId) : null;
  const origin26 = player.teamId ? getTeam(player.teamId) : null;
  const date = formatDate(player.contractEnd);
  let badge = date ? t('r27.until', { date }) : t('player.noDate');
  let badgeTone = 'text-muted';
  if (info.moved) {
    if (origin) {
      badge = t('r27.fromTeam', { abbrev: origin.abbreviation }); // contrato en vigor traspasado
    } else if (player.teamId === teamId) {
      badge = t('r27.renews'); // expiraba y vuelve a firmar por su equipo
    } else {
      badge = origin26 ? t('r27.fromFree', { abbrev: origin26.abbreviation }) : t('r27.signing'); // agente libre fichado
    }
    badgeTone = 'text-accent';
  }

  return (
    <li
      draggable
      onDragStart={(event) => event.dataTransfer.setData('text/plain', player.id)}
      onClick={() => onSelect(player.id)}
      className={`flex cursor-grab items-center gap-2 border border-hairline bg-card p-1.5 transition-colors hover:bg-elevated focus-within:outline-2 focus-within:outline-accent ${
        selected ? 'outline-2 outline-accent' : ''
      }`}
      title={t('r27.dragHint')}
    >
      <PlayerPhoto player={player} size={36} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-caption font-bold uppercase text-ink">{player.name}</span>
          <RoleIcon role={player.role} size={12} className="shrink-0" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`truncate text-caption ${badgeTone}`}>{badge}</span>
        </div>
      </div>
      <div data-no-export className="flex shrink-0 flex-col gap-1">
        {info.hasOverride && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRevert();
            }}
            aria-label={t('r27.revertAria', { name: player.name })}
            title={t('r27.revertTitle')}
            className="flex h-6 w-6 items-center justify-center border border-hairline text-caption text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            ↩
          </button>
        )}
        {player.id.startsWith('ext-') && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveImport(player.id);
            }}
            aria-label={t('r27.removeImportAria', { name: player.name })}
            title={t('r27.removeImportTitle')}
            className="flex h-6 w-6 items-center justify-center border border-hairline text-caption text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
          >
            🗑
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSendToPool();
          }}
          aria-label={t('r27.toPoolAria', { name: player.name })}
          title={t('r27.toPoolTitle')}
          className="flex h-6 w-6 items-center justify-center border border-hairline text-caption text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

export interface PoolNodeProps {
  player: Player;
  info: Projection27;
  selected: boolean;
  onSelect: (playerId: string) => void;
  onRevert: () => void;
  onRemoveImport: (importedId: string) => void;
}

/** Nodo del pool: chip compacto con el motivo (expira 2026, salida, sin fecha). */
export function PoolNode({ player, info, selected, onSelect, onRevert, onRemoveImport }: PoolNodeProps) {
  const { t } = useI18n();
  const badge = info.hasOverride
    ? t('r27.out')
    : player.id.startsWith('ext-')
      ? t('r27.imported')
      : player.contractStatus === 'unknown'
        ? t('player.noDate')
        : t('r27.expires2026');
  const badgeTone = info.hasOverride ? 'text-accent' : 'text-m-red';

  return (
    <li
      draggable
      onDragStart={(event) => event.dataTransfer.setData('text/plain', player.id)}
      onClick={() => onSelect(player.id)}
      className={`flex cursor-grab items-center gap-2 border border-hairline bg-card p-1.5 transition-colors hover:bg-elevated focus-within:outline-2 focus-within:outline-accent ${
        selected ? 'outline-2 outline-accent' : ''
      }`}
      title={t('r27.dragHintPool')}
    >
      <PlayerPhoto player={player} size={36} className="shrink-0" />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-caption font-bold uppercase text-ink">{player.name}</span>
          <RoleIcon role={player.role} size={12} className="shrink-0" />
        </div>
        <span className={`block truncate text-caption ${badgeTone}`}>{badge}</span>
      </div>
      {info.hasOverride && (
        <button
          data-no-export
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRevert();
          }}
          aria-label={t('r27.revertAria', { name: player.name })}
          title={t('r27.revertTitle')}
          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center border border-hairline text-caption text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          ↩
        </button>
      )}
      {player.id.startsWith('ext-') && (
        <button
          data-no-export
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemoveImport(player.id);
          }}
          aria-label={t('r27.removeImportAria', { name: player.name })}
          title={t('r27.removeImportTitle')}
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-hairline text-caption text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
        >
          🗑
        </button>
      )}
    </li>
  );
}
