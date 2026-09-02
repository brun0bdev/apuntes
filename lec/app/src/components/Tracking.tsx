import { useMemo, useState } from 'react';
import { getTeam, players, teams } from '../data/players';
import { importedToPlayer, useProjections } from '../hooks/useProjections';
import { useTracking } from '../hooks/useTracking';
import { normalizeHandle, sortEventsForBoard } from '../lib/tracking';
import type { Player } from '../types/player';
import { TRACKING_KINDS, type TrackingKind } from '../types/tracking';
import { useI18n } from '../i18n';
import { PlayerPhoto } from './PlayerPhoto';
import { RoleIcon } from './RoleIcon';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Apartado "Tracking X" (señales offseason por follows/unfollows): registro de
 * cuentas (jugadores, coaches, GMs, agencias), snapshots manuales de su lista
 * de seguidos y cálculo de diffs. x.com no permite leer follows sin API de
 * pago, así que el snapshot se pega a mano; la app deduce los eventos y marca
 * las señales (p. ej. el coach/GM de un equipo empieza a seguir a un jugador
 * que expira en 2026).
 */
export function Tracking() {
  const { accounts, snapshots, events, addAccount, removeAccount, addSnapshot, removeSnapshot, reset, exportJson } =
    useTracking();
  const { t } = useI18n();
  const { imports } = useProjections();

  const allPlayers = useMemo<Player[]>(
    () => [...players, ...imports.map(importedToPlayer)],
    [imports],
  );
  const playerById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);
  const board = useMemo(() => sortEventsForBoard(events, allPlayers), [events, allPlayers]);

  // Alta de cuenta
  const [handle, setHandle] = useState('');
  const [kind, setKind] = useState<TrackingKind>('coach');
  const [linkPlayerId, setLinkPlayerId] = useState('');
  const [linkTeamId, setLinkTeamId] = useState('');
  const [notes, setNotes] = useState('');

  const submitAccount = () => {
    const ok = addAccount({
      handle,
      kind,
      playerId: kind === 'player' && linkPlayerId ? linkPlayerId : null,
      teamId: kind !== 'player' && linkTeamId ? linkTeamId : null,
      notes,
    });
    if (ok) {
      setHandle('');
      setLinkPlayerId('');
      setLinkTeamId('');
      setNotes('');
    }
  };

  // Formulario de snapshot (uno abierto a la vez)
  const [snapForm, setSnapForm] = useState<{ accountId: string; date: string; text: string } | null>(null);

  return (
    <section aria-label="Tracking X">
      {/* Barra propia de la vista */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline pb-3">
        <div className="min-w-0">
          <h2 className="text-title-md font-bold uppercase text-ink">Tracking X</h2>
          <p className="text-caption text-muted">
            {t('tr.hint')}
          </p>
        </div>
        <p className="ml-auto whitespace-nowrap text-body-sm text-muted" aria-live="polite">
          {t('tr.count', { accounts: accounts.length, snaps: snapshots.length, events: events.length })}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="h-9 border border-hairline bg-card px-3 text-caption font-bold uppercase text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('tr.export')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (accounts.length > 0 && window.confirm(t('tr.resetConfirm'))) reset();
            }}
            className="h-9 border border-hairline bg-card px-3 text-caption font-bold uppercase text-muted hover:bg-elevated hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('tr.reset')}
          </button>
        </div>
      </div>

      {/* Tablón de señales */}
      <div className="mt-4">
        <h3 className="text-body-sm font-bold uppercase text-muted">Actividad y señales</h3>
        {board.length === 0 ? (
          <p className="mt-2 border border-dashed border-hairline bg-soft p-3 text-caption text-muted">
            {t('tr.boardEmpty')}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {board.map((event) => {
              const team = event.teamId ? getTeam(event.teamId) : null;
              const targetPlayer = event.targetPlayerId ? playerById.get(event.targetPlayerId) : null;
              const reason =
                event.signalReason === 'followPlayer'
                  ? t('tr.reasonFollow', {
                      org: team
                        ? t(event.kind === 'agency' ? 'tr.orgAgency' : 'tr.orgStaff', { team: team.abbreviation })
                        : t(`tr.kind.${event.kind}` as never),
                    })
                  : t('tr.reasonUnfollow');
              return (
                <li
                  key={event.id}
                  className={`flex flex-wrap items-center gap-x-2 gap-y-1 border p-2 text-caption ${
                    event.signal ? 'border-accent bg-card' : 'border-hairline bg-soft text-muted'
                  }`}
                >
                  <span className="whitespace-nowrap font-semibold text-body">{event.date}</span>
                  <span className="font-bold text-ink">@{event.accountHandle}</span>
                  <span className="text-muted">({t(`tr.kind.${event.kind}` as never)}{team ? ` · ${team.abbreviation}` : ''})</span>
                  <span className="text-body">{event.type === 'follow' ? t('tr.follows') : t('tr.unfollows')}</span>
                  <span className="font-bold text-ink">@{event.targetHandle}</span>
                  {targetPlayer && (
                    <span className="flex items-center gap-1.5">
                      <PlayerPhoto player={targetPlayer} size={20} />
                      <span className="text-body">{targetPlayer.name}</span>
                      <RoleIcon role={targetPlayer.role} size={12} />
                    </span>
                  )}
                  {event.signal && (
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-muted">{reason}</span>
                      <span className="border border-accent bg-accent px-1.5 py-0.5 text-caption font-bold uppercase text-on-dark">
                        {t('tr.signal')}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Cuentas vigiladas */}
      <div className="mt-6">
        <h3 className="text-body-sm font-bold uppercase text-muted">Cuentas vigiladas</h3>
        {accounts.length === 0 ? (
          <p className="mt-2 border border-dashed border-hairline bg-soft p-3 text-caption text-muted">
            {t('tr.accountsEmpty')}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {accounts.map((account) => {
              const accountSnapshots = snapshots
                .filter((s) => s.accountId === account.id)
                .sort((a, b) => b.date.localeCompare(a.date));
              const linkedPlayer = account.playerId ? playerById.get(account.playerId) : null;
              const team = account.teamId ? getTeam(account.teamId) : null;
              const isFormOpen = snapForm?.accountId === account.id;
              return (
                <li key={account.id} className="border border-hairline bg-card p-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-body-sm font-bold text-ink">@{account.handle}</span>
                    <span className="border border-hairline bg-soft px-1.5 py-0.5 text-caption uppercase text-muted">
                      {t(`tr.kind.${account.kind}` as never)}
                    </span>
                    {linkedPlayer && (
                      <span className="flex items-center gap-1.5 text-caption text-body">
                        <PlayerPhoto player={linkedPlayer} size={20} />
                        {linkedPlayer.name}
                      </span>
                    )}
                    {team && <span className="text-caption text-muted">{team.abbreviation}</span>}
                    <span className="text-caption text-muted">
                      {t('tr.snapshotsCount', { n: accountSnapshots.length })}
                      {accountSnapshots.length > 0 &&
                        ` · ${t('tr.last', { date: accountSnapshots[0].date })}`}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSnapForm(
                            isFormOpen ? null : { accountId: account.id, date: today(), text: '' },
                          )
                        }
                        aria-expanded={isFormOpen}
                        className="h-8 border border-hairline bg-card px-2.5 text-caption font-bold uppercase text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        {isFormOpen ? t('tr.closeForm') : t('tr.addSnapshot')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t('tr.removeAccountConfirm', { handle: account.handle }))) {
                            removeAccount(account.id);
                          }
                        }}
                        aria-label={t('tr.removeAccountAria', { handle: account.handle })}
                        className="flex h-8 w-8 items-center justify-center border border-hairline text-caption text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        🗑
                      </button>
                    </span>
                  </div>

                  {isFormOpen && snapForm && (
                    <div className="mt-2 border-t border-hairline pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={snapForm.date}
                          onChange={(event) => setSnapForm({ ...snapForm, date: event.target.value })}
                          aria-label={t('tr.snapshotDate')}
                          className="h-8 border border-hairline bg-card px-2 text-caption text-ink focus-visible:outline-2 focus-visible:outline-accent"
                        />
                        <textarea
                          value={snapForm.text}
                          onChange={(event) => setSnapForm({ ...snapForm, text: event.target.value })}
                          placeholder={t('tr.snapshotPlaceholder')}
                          aria-label={t('tr.snapshotList')}
                          rows={3}
                          className="min-w-0 flex-1 border border-hairline bg-card p-2 text-caption text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (addSnapshot(account.id, snapForm.date, snapForm.text)) setSnapForm(null);
                          }}
                          className="h-8 border border-accent bg-accent px-3 text-caption font-bold uppercase text-on-dark hover:bg-accent-active focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          {t('tr.save', { n: parseCount(snapForm.text) })}
                        </button>
                      </div>
                      <ul className="mt-2 flex flex-col gap-1">
                        {accountSnapshots.map((snapshot) => (
                          <li key={snapshot.id} className="flex items-center gap-2 text-caption text-muted">
                            <span className="font-semibold text-body">{snapshot.date}</span>
                            <span>{t('tr.followingCount', { n: snapshot.following.length })}</span>
                            <span className="truncate">({snapshot.following.slice(0, 8).map((h) => `@${h}`).join(' ')}{snapshot.following.length > 8 ? ' …' : ''})</span>
                            <button
                              type="button"
                              onClick={() => removeSnapshot(snapshot.id)}
                              aria-label={`Eliminar el snapshot del ${snapshot.date}`}
                              className="ml-auto text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Alta de cuenta */}
      <form
        className="mt-6 border border-hairline bg-soft p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submitAccount();
        }}
      >
        <span className="text-body-sm font-bold uppercase text-ink">{t('tr.addAccount')}</span>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder={t('tr.handlePlaceholder')}
            aria-label={t('tr.handleAria')}
            className="h-9 w-40 border border-hairline bg-card px-2.5 text-caption text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
          />
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as TrackingKind)}
            aria-label={t('tr.kindAria')}
            className="h-9 border border-hairline bg-card px-2 text-caption text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            {TRACKING_KINDS.map((value) => (
              <option key={value} value={value}>
                {t(`tr.kind.${value}` as never)}
              </option>
            ))}
          </select>
          {kind === 'player' ? (
            <select
              value={linkPlayerId}
              onChange={(event) => setLinkPlayerId(event.target.value)}
              aria-label={t('tr.playerLinkAria')}
              className="h-9 max-w-56 border border-hairline bg-card px-2 text-caption text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">{t('tr.playerLinkNone')}</option>
              {allPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={linkTeamId}
              onChange={(event) => setLinkTeamId(event.target.value)}
              aria-label={t('tr.teamLinkAria')}
              className="h-9 max-w-56 border border-hairline bg-card px-2 text-caption text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">{t('tr.teamLinkNone')}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('tr.notesPlaceholder')}
            aria-label={t('tr.notesAria')}
            className="h-9 min-w-40 flex-1 border border-hairline bg-card px-2.5 text-caption text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
          />
          <button
            type="submit"
            disabled={normalizeHandle(handle).length === 0}
            className="h-9 border border-accent bg-accent px-3 text-caption font-bold uppercase text-on-dark hover:bg-accent-active focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-hairline disabled:bg-card disabled:text-muted"
          >
            {t('tr.add')}
          </button>
        </div>
      </form>
    </section>
  );
}

function parseCount(text: string): number {
  return normalizeHandle(text) ? text.split(/[\s,;]+/).filter((part) => part.trim() !== '').length : 0;
}
