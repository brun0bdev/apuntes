import { useEffect, useRef, useState } from 'react';
import { getAgent, getTeam } from '../data/players';
import { assetUrl } from '../lib/assets';
import { contractState } from '../lib/contract';
import { flagImg, formatDate, isEstimatedDate } from '../lib/format';
import type { Player, Team, TeamHistoryEntry } from '../types/player';
import { useI18n } from '../i18n';
import { ContractBadge } from './ContractBadge';
import { PlayerPhoto } from './PlayerPhoto';
import { RoleIcon } from './RoleIcon';

interface PlayerDrawerProps {
  player: Player;
  onClose: () => void;
}

function FieldLabel({ children }: { children: string }) {
  return <p className="text-label-uppercase uppercase text-muted">{children}</p>;
}

/** Entrada de la línea de tiempo de equipos (dato manual, fuente GCD). */
function TimelineEntry({ entry, isLast }: { entry: TeamHistoryEntry; isLast: boolean }) {
  return (
    <li className="relative pb-4 pl-5 last:pb-0">
      <span aria-hidden="true" className="absolute -left-1 top-1.5 h-2 w-2 bg-muted" />
      {!isLast && <span aria-hidden="true" className="absolute left-0 top-4 h-full w-px bg-hairline" />}
      <p className="text-body-md font-bold text-ink">{entry.team}</p>
      <p className="text-caption text-muted">{entry.years}</p>
    </li>
  );
}

/** Logo + nombre del equipo actual con fallback a abreviatura. */
function TeamMark({ team }: { team: Team | undefined }) {
  const [failed, setFailed] = useState(false);

  if (!team) return <span className="text-body-md text-body">—</span>;
  return (
    <span className="flex items-center gap-2 text-body-md font-bold text-ink">
      {team.logo && !failed ? (
        <img
          src={assetUrl(team.logo)}
          alt=""
          width={60}
          height={25}
          onError={() => setFailed(true)}
          className={`h-6 w-auto ${team.mono ? `team-logo--mono-${team.mono}` : ''}`}
        />
      ) : (
        <span className="text-label-uppercase uppercase text-muted">{team.abbreviation}</span>
      )}
      {team.name}
    </span>
  );
}

/**
 * Ficha de jugador (PLAN.md §4): drawer lateral de ~420px en escritorio,
 * pantalla completa en móvil. Cierra con ESC, clic en el overlay y botón ✕;
 * foco atrapado dentro mientras está abierta.
 */
export function PlayerDrawer({ player, onClose }: PlayerDrawerProps) {
  const { t, roleLabel } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const team = getTeam(player.teamId);
  const agent = getAgent(player.agentId);
  const flag = player.nationality ? flagImg(player.nationality) : null;
  const date = formatDate(player.contractEnd);
  const estimated = isEstimatedDate(player);

  // Foco inicial, bloqueo de scroll y devolución del foco al cerrar.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  // ESC + trampa de foco básica (Tab cicla dentro del panel).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-canvas/80" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('drawer.dialogAria', { name: player.name })}
        tabIndex={-1}
        className="fixed inset-0 overflow-y-auto bg-canvas outline-none md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:border-l md:border-hairline"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas px-4 py-3">
          <p className="text-label-uppercase uppercase text-muted">{t('drawer.title')}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('drawer.close')}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-card text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 pb-10 pt-6">
          {/* Identidad: foto grande, nombre, nombre real y bandera si hay dato */}
          <div className="flex items-start gap-4">
            <PlayerPhoto player={player} size={96} />
            <div className="min-w-0">
              <p className="text-title-lg font-bold text-ink">{player.name}</p>
              <p className="text-body-sm text-muted">{player.realName}</p>
              {flag && player.nationality && (
                <p className="mt-1 flex items-center gap-1.5 text-body-sm text-body">
                  <img src={assetUrl(flag)} alt="" width={20} height={14} className="h-3.5 w-auto" />
                  {player.nationality}
                </p>
              )}
            </div>
          </div>

          {/* Equipo y rol */}
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4 border-y border-hairline py-4">
            <div>
              <FieldLabel>{t('drawer.team')}</FieldLabel>
              <div className="mt-1">
                <TeamMark team={team} />
              </div>
            </div>
            <div>
              <FieldLabel>{t('drawer.role')}</FieldLabel>
              <p className="mt-1 flex items-center gap-2 text-body-md text-body">
                <RoleIcon role={player.role} size={18} />
                {roleLabel(player.role)}
              </p>
            </div>
          </div>

          {/* Contrato: badge + fecha formateada (+ nota de estimación si procede) */}
          <div>
            <FieldLabel>{t('drawer.contract')}</FieldLabel>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <ContractBadge state={contractState(player)} />
              <span className="text-body-md text-body">
                {date ?? t('drawer.unknownDate')}
                {estimated && (
                  <>
                    <span aria-hidden="true" className="ml-1 text-muted">
                      ≈
                    </span>
                    <span className="sr-only"> {t('player.estimatedSr')}</span>
                  </>
                )}
              </span>
            </div>
            {player.notes !== '' && <p className="mt-2 text-caption text-muted">{player.notes}</p>}
          </div>

          {/* Agente / agencia (dato manual): "—" mientras no esté rellenado */}
          <div>
            <FieldLabel>{t('drawer.agent')}</FieldLabel>
            {agent ? (
              <p className="mt-1 text-body-md font-bold text-ink">
                {agent.name}
                {agent.website && (
                  <a
                    href={agent.website}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-3 align-middle text-label-uppercase uppercase font-normal text-accent hover:text-accent-active focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {t('drawer.web')}
                  </a>
                )}
              </p>
            ) : (
              <p className="mt-1 text-body-md text-body">—</p>
            )}
          </div>

          {/* Nota 2026 (esportstransfer.com): score estandarizado (5.00 =
              media de la liga por construcción) */}
          <div>
            <FieldLabel>{t('drawer.rating')}</FieldLabel>
            <p className="mt-1 text-body-md text-body">
              {player.rating != null ? player.rating.toFixed(2) : '—'}
            </p>
          </div>

          {/* Historial de equipos: la sección solo se muestra si hay entradas.
              Leaguepedia lista de más antiguo a más reciente; se invierte para
              que el equipo ACTUAL quede primero (de arriba abajo). */}
          {player.teamHistory.length > 0 && (
            <div>
              <FieldLabel>{t('drawer.history')}</FieldLabel>
              <ol className="mt-3">
                {[...player.teamHistory].reverse().map((entry, index) => (
                  <TimelineEntry
                    key={`${entry.team}-${entry.years}`}
                    entry={entry}
                    isLast={index === player.teamHistory.length - 1}
                  />
                ))}
              </ol>
            </div>
          )}

          {/* Enlace externo */}
          {player.sourceUrl && (
            <a
              href={player.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-label-uppercase uppercase text-accent hover:text-accent-active focus-visible:outline-2 focus-visible:outline-accent"
            >
              {t('drawer.viewLeaguepedia')}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
