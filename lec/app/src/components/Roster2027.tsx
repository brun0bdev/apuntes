import { useCallback, useMemo, useState, type DragEvent } from 'react';
import { players, teams } from '../data/players';
import { ROLE_ORDER } from '../lib/roles';
import { useI18n } from '../i18n';
import { searchLeaguepediaPlayer } from '../lib/leaguepedia';
import type { ImportedPlayer, League, Player, Role } from '../types/player';
import { importedToPlayer, serializeProjParam, useProjections } from '../hooks/useProjections';
import { CopyLinkButton } from './CopyLinkButton';
import { ExportPngButton } from './ExportPngButton';
import { LeagueSelect } from './LeagueSelect';
import { PlayerPhoto } from './PlayerPhoto';
import { RoleIcon } from './RoleIcon';
import { PoolNode, TeamColumn, type DropTargetId } from './shared27';

const norm = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

interface Roster2027Props {
  /** Liga activa del selector (scopea columnas de equipo y pool). */
  league: League;
  onLeagueChange: (league: League) => void;
}

/**
 * Vista "2027" (PLAN.md M4): árbol editable de relaciones equipo → jugador y
 * equipo → staff. Por defecto, cada jugador/coach cuelga de su equipo si su
 * contrato va más allá de 2026 y del pool si expira; cualquiera puede moverse
 * a cualquier equipo arrastrándolo o seleccionándolo (clic) y pulsando luego
 * el equipo destino. Los cambios persisten en localStorage y se exportan como
 * data/projections.json. El pool se puede filtrar y admite añadir jugadores de
 * otras ligas buscándolos en Leaguepedia.
 */
export function Roster2027({ league, onLeagueChange }: Roster2027Props) {
  const { resolve, move, revert, assignments, imports, addImport, removeImport, reset, movementCount, exportJson } =
    useProjections();
  const { t, roleLabel } = useI18n();
  const projParam = serializeProjParam(assignments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetId>(null);
  const [poolQuery, setPoolQuery] = useState('');
  const [poolRole, setPoolRole] = useState<Role | ''>('');

  // Solo la liga activa: columnas de equipo y pool scopeados por el selector.
  const leaguePlayers = useMemo(() => players.filter((p) => p.league === league), [league]);
  const leagueTeams = useMemo(() => teams.filter((team) => team.league === league), [league]);
  const players27 = useMemo<Player[]>(
    () => [...leaguePlayers.filter((p) => !p.isCoach), ...imports.map(importedToPlayer).filter((p) => p.role !== 'coach')],
    [leaguePlayers, imports],
  );
  const allIds = useMemo(() => new Set(players27.map((p) => p.id)), [players27]);

  const groupTree = useCallback(
    (list: Player[]) => {
      const map = new Map<string, Player[]>(leagueTeams.map((team) => [team.id, [] as Player[]]));
      const free: Player[] = [];
      for (const p of list) {
        const target = resolve(p).teamId;
        if (target) map.get(target)?.push(p);
        else free.push(p);
      }
      const byRole = (a: Player, b: Player) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name, 'es');
      for (const l of map.values()) l.sort(byRole);
      free.sort(byRole);
      return { map, pool: free };
    },
    [resolve, leagueTeams],
  );

  const { map: byTeam, pool } = useMemo(() => groupTree(players27), [groupTree, players27]);

  const filteredPool = useMemo(() => {
    const query = norm(poolQuery.trim());
    return pool.filter(
      (p) =>
        (poolRole === '' || p.role === poolRole) &&
        (query === '' || norm(p.name).includes(query) || norm(p.realName).includes(query)),
    );
  }, [pool, poolQuery, poolRole]);

  const toggleSelect = (playerId: string) =>
    setSelectedId((current) => (current === playerId ? null : playerId));

  /** El target "{scope}:{teamId|pool}" se traduce a teamId (null = pool). */
  const teamIdOfKey = (key: string): string | null => {
    const rest = key.split(':')[1];
    return rest === 'pool' ? null : rest;
  };

  const onDrop = (key: string) => (event: DragEvent) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    if (id && allIds.has(id)) move(id, teamIdOfKey(key));
    setDropTarget(null);
  };

  const dragOver = (key: string) => (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTarget !== key) setDropTarget(key);
  };

  const dragLeave = (key: string) => (event: DragEvent) => {
    // Solo limpiar si de verdad salimos del contenedor (no al cruzar hijos).
    const node = event.currentTarget as Element;
    if (!(event.relatedTarget instanceof Node) || !node.contains(event.relatedTarget)) {
      if (dropTarget === key) setDropTarget(null);
    }
  };

  const headerClick = (key: string) => {
    if (selectedId) {
      move(selectedId, teamIdOfKey(key));
      setSelectedId(null);
    }
  };

  return (
    <section aria-label="Roster proyectado 2027" data-export-root>
      {/* Barra propia de la vista (sustituye a la de filtros). Excluida de la
          exportación PNG: el marco lleva título y contadores. */}
      <div data-no-export className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline pb-3">
        <div className="min-w-0">
          <h2 className="text-title-md font-bold uppercase text-ink">{t('r27.title')}</h2>
          <p className="text-caption text-muted">
            {t('r27.hint')}
          </p>
        </div>
        <p className="ml-auto whitespace-nowrap text-body-sm text-muted" aria-live="polite">
          {t('r27.count', { moves: movementCount, pool: pool.length })}
        </p>
        <div className="flex items-center gap-2">
          <LeagueSelect value={league} onChange={onLeagueChange} />
          <ExportPngButton
            size="md"
            filename={`scouting-lec-roster-2027-${league}.png`}
            config={{ title: league === 'lcs' ? 'LCS 2027' : undefined }}
          />
          <CopyLinkButton view="roster2027" proj={projParam} />
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
              if (movementCount > 0 && window.confirm(t('r27.resetConfirm'))) reset();
            }}
            className="h-9 border border-hairline bg-card px-3 text-caption font-bold uppercase text-muted hover:bg-elevated hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('r27.reset')}
          </button>
        </div>
      </div>

      {/* Panel de búsqueda en Leaguepedia (jugadores y staff de otras ligas) */}
      <div data-no-export>
        <LeaguepediaSearch
          knownIds={allIds}
          onAdd={(imported) => {
            addImport(imported);
            setPoolQuery(''); // que el nuevo jugador sea visible en su pool
            setPoolRole('');

          }}
        />
      </div>

      {/* Árbol de equipos (misma retícula 2×5 que la parrilla) */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {leagueTeams.map((team) => (
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

      {/* Pool de agentes libres / sin equipo */}
      <div
        onDragOver={dragOver('players:pool')}
        onDragLeave={dragLeave('players:pool')}
        onDrop={onDrop('players:pool')}
        className={`mt-6 border border-dashed border-hairline bg-soft p-3 ${
          dropTarget === 'players:pool' ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => headerClick('players:pool')}
            aria-label={selectedId ? t('r27.poolMoveAria') : t('r27.poolAria')}
            className="block text-left"
          >
            <span className="text-body-sm font-bold uppercase text-ink">{t('r27.pool')}</span>
            <span className="ml-3 text-caption text-muted">
              {t('r27.poolHint')}
            </span>
          </button>
          <div data-no-export className="ml-auto flex items-center gap-2">
            <input
              type="search"
              value={poolQuery}
              onChange={(event) => setPoolQuery(event.target.value)}
              placeholder={t('r27.poolFilterPlaceholder')}
              aria-label={t('r27.poolFilterAria')}
              className="h-8 w-44 border border-hairline bg-card px-2.5 text-caption text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
            />
            <select
              value={poolRole}
              onChange={(event) => setPoolRole(event.target.value as Role | '')}
              aria-label={t('r27.poolRoleAria')}
              className="h-8 border border-hairline bg-card px-2 text-caption text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">{t('r27.poolRoleAll')}</option>
              {ROLE_ORDER.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
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

interface LeaguepediaSearchProps {
  knownIds: Set<string>;
  onAdd: (imported: ImportedPlayer) => void;
}

type SearchState = 'idle' | 'loading' | 'done' | 'error';

/**
 * Buscador en vivo contra Leaguepedia (api.php, CORS anónimo). Resuelve hasta
 * 6 candidatos que sean páginas de jugador y permite añadirlos al pool; los
 * fallos de un candidato individual no abortan la búsqueda.
 */
function LeaguepediaSearch({ knownIds, onAdd }: LeaguepediaSearchProps) {
  const { t } = useI18n();
  const [term, setTerm] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [results, setResults] = useState<ImportedPlayer[]>([]);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const run = async () => {
    if (term.trim().length < 2 || state === 'loading') return;
    setState('loading');
    setError('');
    try {
      const found = await searchLeaguepediaPlayer(term);
      setResults(found);
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
        <span className="text-body-sm font-bold uppercase text-ink">{t('r27.addOther')}</span>
        <span className="text-caption text-muted">{t('r27.addHint')}</span>
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
            aria-label={t('r27.searchAria')}
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
        <p className="mt-2 text-caption text-muted">{t('r27.noResults')}</p>
      )}
      {results.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {results.map((candidate) => {
            const added = addedIds.includes(candidate.id) || knownIds.has(candidate.id);
            return (
              <li
                key={candidate.id}
                className="flex items-center gap-2 border border-hairline bg-card p-1.5"
              >
                <PlayerPhoto
                  player={{ ...importedToPlayer(candidate) }}
                  size={32}
                  className="shrink-0"
                />
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
                  aria-label={t('r27.addAria', { name: candidate.name })}
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

/** Baldosa del logo reutilizando el patrón de la cabecera de la parrilla. */
