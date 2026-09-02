import { getAgent, getTeam } from '../data/players';
import { contractState } from '../lib/contract';
import { formatDate, isEstimatedDate } from '../lib/format';
import type { Player } from '../types/player';
import { useI18n } from '../i18n';
import { ContractBadge } from './ContractBadge';
import { PlayerPhoto } from './PlayerPhoto';
import { RoleIcon } from './RoleIcon';

interface PlayerCardProps {
  player: Player;
  /** Cliente del agente filtrado: borde 2px accent + fondo elevado. */
  highlighted: boolean;
  /** No es cliente del agente filtrado: se atenúa a opacity 0.35 (sigue siendo clicable). */
  dimmed: boolean;
  onSelect: (playerId: string) => void;
}

/**
 * Tarjeta de jugador al estilo del diseño de referencia: barra de acento con
 * el color de marca del equipo, foto cuadrada, nombre en mayúsculas con el
 * icono de rol al lado, fecha (roja si expira en 2026) + chip "2026" y la
 * línea de agente. Es un botón: abre la ficha.
 */
export function PlayerCard({ player, highlighted, dimmed, onSelect }: PlayerCardProps) {
  const { t } = useI18n();
  const state = contractState(player);
  const expiring = state === 'expiring2026';
  const date = formatDate(player.contractEnd);
  const estimated = isEstimatedDate(player) && date !== null;
  const agent = getAgent(player.agentId);
  const team = getTeam(player.teamId);
  const highlightClasses = highlighted ? 'bg-elevated outline-2 outline-accent' : '';
  const dimmingClasses = dimmed ? 'opacity-35' : '';

  return (
    <button
      type="button"
      onClick={() => onSelect(player.id)}
      aria-label={t('player.viewProfileAria', { name: player.name })}
      style={{ borderLeftColor: team?.color }}
      className={`w-full border border-hairline border-l-4 bg-card p-2 text-left transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent ${highlightClasses} ${dimmingClasses}`}
    >
      <span className="flex items-center gap-2.5">
        <PlayerPhoto player={player} size={48} className="shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="min-w-0 truncate text-body-sm font-bold uppercase text-ink">{player.name}</span>
            <RoleIcon role={player.role} size={14} className="self-center" />
          </span>
          <span className="flex items-center gap-1.5">
            {date ? (
              <span
                className={`whitespace-nowrap text-caption font-semibold ${expiring ? 'text-m-red' : 'text-muted'}`}
              >
                {estimated && (
                  <span aria-hidden="true" className="mr-0.5 text-muted">
                    ≈
                  </span>
                )}
                {date}
                {estimated && <span className="sr-only"> {t('player.estimatedSr')}</span>}
              </span>
            ) : (
              <span className="text-caption text-muted">{t('player.noDate')}</span>
            )}
            <ContractBadge state={state} compact />
          </span>
          <span className="truncate text-caption text-muted">
            {agent ? t('player.agentKnown', { name: agent.name }) : t('player.agentTbd')}
          </span>
        </span>
      </span>
    </button>
  );
}
