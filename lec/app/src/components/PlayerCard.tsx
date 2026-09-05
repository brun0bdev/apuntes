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
 * el color de marca del equipo, cinta vertical de rating en el borde izquierdo
 * (solo cuando hay nota), foto cuadrada, nombre en mayúsculas con el icono de
 * rol al lado, fecha (roja si expira en 2026) + chip "2026" y la línea de
 * agente. Es un botón: abre la ficha.
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

  /*
   * Anillo de progreso alrededor de la foto + número en la esquina superior
   * derecha: nota estandarizada (score) sobre la escala completa 0-10, donde
   * 5.00 = media de la liga por construcción (z·1.6σ). Tramos tipo examen:
   * verde ≥ 5.00 (aprobado, por encima o en la media), ámbar 4.00-4.99 (roce
   * del suspenso), rojo < 4.00 (suspenso claro, z ≤ −1.25 aprox). Los umbrales
   * antiguos 7/3 ya no aplican. Sin dato (null, coaches y fichajes sin nota
   * incluidos) ni foto fallida → no se pinta el anillo y la card queda igual.
   * El arco es un SVG (stroke-dasharray, circunferencia r=25 ≈ 157) que empieza
   * a las 12 y crece en sentido horario; la pista gris da contexto de escala.
   * El guard por typeof cubre también `undefined` (players.json aún sin el
   * campo hasta regenerar datos).
   */
  const rating = typeof player.rating === 'number' ? player.rating : null;
  const ratingColor =
    rating === null
      ? null
      : rating >= 7.0
        ? 'var(--m-blue-dark)' // élite (top ~6 de la liga): azul firma BMW M, destaca sobre el verde
        : rating >= 5.0
          ? 'var(--success)'
          : rating >= 4.0
            ? 'var(--warning)'
            : 'var(--danger)';
  // Clase del número de la esquina (el anillo usa ratingColor directo).
  const ratingTextClass =
    rating === null
      ? ''
      : rating >= 7.0
        ? 'text-m-blue-dark'
        : rating >= 5.0
          ? 'text-success'
          : rating >= 4.0
            ? 'text-warning'
            : 'text-danger';
  // 0-10 → proporción del círculo (note que el tramo bajo no vacía del todo el anillo)
  const ratingPct = rating === null ? 0 : Math.max(4, Math.min(100, rating * 10));
  const ratingArc = (ratingPct / 100 * 157).toFixed(1);

  return (
    <button
      type="button"
      onClick={() => onSelect(player.id)}
      aria-label={t('player.viewProfileAria', { name: player.name })}
      style={{ borderLeftColor: team?.color }}
      className={`relative w-full border border-hairline border-l-4 bg-card p-2 text-left transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent ${highlightClasses} ${dimmingClasses}`}
    >
      <span className="flex items-center gap-2.5">
        {ratingColor ? (
          <span className="relative block h-12 w-12 shrink-0">
            <svg
              viewBox="0 0 54 54"
              aria-hidden="true"
              className="pointer-events-none absolute -inset-[3px] h-[54px] w-[54px]"
            >
              <circle cx="27" cy="27" r="25" fill="none" stroke="var(--hairline)" strokeWidth="3" />
              <circle
                cx="27"
                cy="27"
                r="25"
                fill="none"
                stroke={ratingColor}
                strokeWidth="3"
                strokeLinecap="butt"
                strokeDasharray={`${ratingArc} 157`}
                transform="rotate(-90 27 27)"
              />
            </svg>
            <PlayerPhoto player={player} size={48} className="rounded-full" />
          </span>
        ) : (
          <PlayerPhoto player={player} size={48} className="shrink-0" />
        )}
        {rating !== null && (
          <span
            aria-hidden="true"
            className={`absolute right-2 top-1 text-caption font-bold ${ratingTextClass}`}
          >
            {rating.toFixed(2)}
          </span>
        )}
        {/* Con nota, el número ocupa la esquina superior derecha: el padding
            derecho evita que el nombre/icono de rol se metan debajo. */}
        <span className={`flex min-w-0 flex-1 flex-col gap-0.5 ${rating !== null ? 'pr-9' : ''}`}>
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="min-w-0 truncate text-body-sm font-bold uppercase text-ink">{player.name}</span>
            <RoleIcon role={player.role} size={14} className="self-center shrink-0" />
          </span>
          {/* Altura fija: el chip romboidal del badge es más alto que la
              fecha y engordaría solo esas tarjetas (desalineación 81/77px). */}
          <span className="flex h-[17px] items-center gap-1.5">
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
