import { useMemo, useState, type DragEvent } from 'react';
import { players, teams } from '../data/players';
import { ROLE_ORDER } from '../lib/roles';
import { useI18n } from '../i18n';
import { importedToPlayer, useProjections } from '../hooks/useProjections';
import { searchLeaguepediaPlayer } from '../lib/leaguepedia';
import type { ImportedPlayer, Player } from '../types/player';
import { TeamColumn, PoolNode, type DropTargetId } from './shared27';
import { PlayerPhoto } from './PlayerPhoto';
import { RoleIcon } from './RoleIcon';

const norm = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Vista "Staff 2027": el mismo árbol editable que los jugadores pero para el
 * cuerpo técnico de los equipos (coaches). Por defecto cada coach cuelga de su
 * equipo si su contrato va más allá de 2026; del resto se ocupa el pool. Se
 * puede añadir staff de otras ligas buscándolo en Leaguepedia.
 */
export function Staff2027() {
  const { resolve, move, revert, imports, addImport, removeImport, reset, exportJson } =
    useProjections();
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetId>(null);
  const [poolQuery, setPoolQuery] = useState('');

  const staff = useMemo<Player[]>(
    () => [...players.filter((p) => p.isCoach), ...imports.map(importedToPlayer).filter((p) => p.role === 'coach')],
    [imports],
  );
  const allIds = useMemo(() => new Set(staff.map((p) => p.id)), [staff]);

  const { byTeam, pool } = useMemo(() => {
    const byRole = (a: Player, b: Player) =>
      ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name, 'es');
    const map = new Map<string, Player[]>();
    const free: Player[] = [];
    for (const p of staff) {
      const target = resolve(p).teamId;
      if (target) {
        if (!map.has(target)) map.set(target, []);
        map.get(target)!.push(p);
      } else {
        free.push(p);
      }
    }
    for (const list of map.values()) list.sort(byRole);
    free.sort(byRole);
    return { byTeam: map, pool: free };
  }, [resolve, staff]);

  const filteredPool = useMemo(() => {
    const query = norm(poolQuery.trim());
    return pool.filter((p) => query === '' || norm(p.name).includes(query));
  }, [pool, poolQuery]);

  const toggleSelect = (playerId: string) =>
    setSelectedId((current) => (current === playerId ? null : playerId));

  const onDrop = (target: string | null) => (event: DragEvent) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    if (id && allIds.has(id)) move(id, target);
    setDropTarget(null);
  };

  const dragOver = (target: string | null) => (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTarget !== target) setDropTarget(target);
  };

  const dragLeave = (target: string | null) => (event: DragEvent) => {
    const node = event.currentTarget as Element;
    if (!(event.relatedTarget instanceof Node) || !node.contains(event.relatedTarget)) {
      if (dropTarget === target) setDropTarget(null);
    }
  };

  const headerClick = (target: string | null) => {
    if (selectedId) {
      move(selectedId, target);
      setSelectedId(null);
    }
  };

  return (
    <section aria-label="Staff proyectado 2027">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline pb-3">
        <div className="min-w-0">
          <h2 className="text-title-md font-bold uppercase text-ink">{t('staff.title')}</h2>
          <p className="text-caption text-muted">{t('staff.hint')}</p>
        </div>
        <p className="ml-auto whitespace-nowrap text-body-sm text-muted" aria-live="polite">
          {t('staff.count', { total: staff.length, pool: pool.length })}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="h-9 border border-hairline bg-card px-3 text-caption font-bold uppercase text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('r27.export')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('r27.resetConfirm'))) reset();
            }}
            className="h-9 border border-hairline bg-card px-3 text-caption font-bold uppercase text-muted hover:bg-elevated hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('r27.reset')}
          </button>
        </div>
      </div>

      {/* Staff de otras ligas vía Leaguepedia */}
      <LeaguepediaStaffSearch
        knownIds={allIds}
        onAdd={(imported) => {
          addImport(imported);
          setPoolQuery('');
        }}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {teams.map((team) => (
          <TeamColumn
            key={team.id}
            scope="players"
            team={team}
            members={byTeam.get(team.id) ?? []}
            dropTarget={dropTarget}
            selectedId={selectedId}
            resolve={resolve}
            onSelect={toggleSelect}
            onMove={move}
            onRevert={revert}
            onRemoveImport={removeImport}
            dragOver={dragOver}
            dragLeave={dragLeave}
            onDropKey={onDrop}
            headerClick={headerClick}
          />
        ))}
      </div>

      {/* Pool de staff sin equipo */}
      <div
        onDragOver={dragOver('pool')}
        onDragLeave={dragLeave('pool')}
        onDrop={onDrop('pool')}
        className={`mt-6 border border-dashed border-hairline bg-soft p-3 ${
          dropTarget === 'pool' ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => headerClick('pool')}
            aria-label={selectedId ? t('r27.poolMoveAria') : t('staff.poolAria')}
            className="block text-left"
          >
            <span className="text-body-sm font-bold uppercase text-ink">{t('staff.pool')}</span>
            <span className="ml-3 text-caption text-muted">{t('staff.poolHint')}</span>
          </button>
          <input
            type="search"
            value={poolQuery}
            onChange={(event) => setPoolQuery(event.target.value)}
            placeholder={t('staff.filterPlaceholder')}
            aria-label={t('staff.filterAria')}
            className="ml-auto h-8 w-44 border border-hairline bg-card px-2.5 text-caption text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
          />
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {filteredPool.map((player) => (
            <PoolNode
              key={player.id}
              player={player}
              info={resolve(player)}
              selected={selectedId === player.id}
              onSelect={toggleSelect}
              onRevert={() => revert(player.id)}
              onRemoveImport={removeImport}
            />
          ))}
          {filteredPool.length === 0 && (
            <li className="text-caption text-muted">
              {pool.length === 0 ? t('r27.poolEmpty') : t('r27.filterNoResults')}
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

interface LeaguepediaStaffSearchProps {
  knownIds: Set<string>;
  onAdd: (imported: ImportedPlayer) => void;
}

/**
 * Buscador en vivo de staff (coaches) contra Leaguepedia: los candidatos con
 * rol coach se pueden añadir al pool de staff de 2027.
 */
function LeaguepediaStaffSearch({ knownIds, onAdd }: LeaguepediaStaffSearchProps) {
  const { t } = useI18n();
  const [term, setTerm] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<ImportedPlayer[]>([]);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const run = async () => {
    if (term.trim().length < 2 || state === 'loading') return;
    setState('loading');
    setError('');
    try {
      const found = await searchLeaguepediaPlayer(term);
      // En esta vista solo interesan los coaches.
      setResults(found.filter((c) => c.role === 'coach'));
      setState('done');
      setError('');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Error de red');
      setResults([]);
    }
  };

  const add = (imported: ImportedPlayer) => {
    onAdd(imported);
    setAddedIds((current) => [...current, imported.id]);
  };

  return (
    <div className="mt-4 border border-hairline bg-soft p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm font-bold uppercase text-ink">{t('staff.addOther')}</span>
        <span className="text-caption text-muted">{t('staff.addHint')}</span>
        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t('r27.searchPlaceholder')}
            aria-label={t('staff.searchAria')}
            className="h-8 w-52 border border-hairline bg-card px-2.5 text-caption text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
          />
          <button
            type="submit"
            disabled={state === 'loading' || term.trim().length < 2}
            className="h-8 border border-hairline bg-card px-3 text-caption font-bold uppercase text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-muted"
          >
            {state === 'loading' ? t('r27.searching') : t('r27.search')}
          </button>
        </form>
      </div>
      {state === 'error' && <p className="mt-2 text-caption text-danger">{error}</p>}
      {state === 'done' && results.length === 0 && !error && (
        <p className="mt-2 text-caption text-muted">{t('staff.noCoaches')}</p>
      )}
      {results.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {results.map((candidate) => {
            const added = addedIds.includes(candidate.id) || knownIds.has(candidate.id);
            return (
              <li key={candidate.id} className="flex items-center gap-2 border border-hairline bg-card p-1.5">
                <PlayerPhoto player={{ ...importedToPlayer(candidate) }} size={32} className="shrink-0" />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate text-caption font-bold uppercase text-ink">
                      {candidate.name}
                    </span>
                    <RoleIcon role={candidate.role} size={12} className="shrink-0" />
                  </div>
                  <span className="block truncate text-caption text-muted">
                    {candidate.originTeamName ?? t('r27.noTeamInInfobox')}
                  </span>
                </div>
                <a
                  href={candidate.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('r27.viewPageTitle', { name: candidate.name })}
                  title={t('drawer.viewLeaguepedia')}
                  className="flex h-6 w-6 items-center justify-center border border-hairline text-caption text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                >
                  ↗
                </a>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => add(candidate)}
                  aria-label={t('staff.addAria', { name: candidate.name })}
                  className={`h-8 border px-2 text-caption font-bold uppercase focus-visible:outline-2 focus-visible:outline-accent ${
                    added
                      ? 'border-hairline text-muted'
                      : 'border-accent bg-accent text-on-dark hover:bg-accent-active'
                  }`}
                >
                  {added ? t('r27.added') : t('r27.add')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
