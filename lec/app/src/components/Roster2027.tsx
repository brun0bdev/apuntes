import { useCallback, useMemo, useState, type DragEvent } from 'react';
import { assetUrl } from '../lib/assets';
import { getTeam, players, teams } from '../data/players';
import { formatDate, isEstimatedDate } from '../lib/format';
import { ROLE_ORDER } from '../lib/roles';
import { useI18n } from '../i18n';
import { importedToPlayer, useProjections, type Projection27 } from '../hooks/useProjections';
import { searchLeaguepediaPlayer } from '../lib/leaguepedia';
import type { ImportedPlayer, Player, Role, Team } from '../types/player';
import { PlayerPhoto } from './PlayerPhoto';
import { RoleIcon } from './RoleIcon';

type Scope = 'players' | 'staff';
/** Clave de drop target: "{scope}:{teamId|pool}". */
type DropTargetId = string | null;

const norm = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Vista "2027" (PLAN.md M4): árbol editable de relaciones equipo → jugador y
 * equipo → staff. Por defecto, cada jugador/coach cuelga de su equipo si su
 * contrato va más allá de 2026 y del pool si expira; cualquiera puede moverse
 * a cualquier equipo arrastrándolo o seleccionándolo (clic) y pulsando luego
 * el equipo destino. Los cambios persisten en localStorage y se exportan como
 * data/projections.json. El pool se puede filtrar y admite añadir jugadores de
 * otras ligas buscándolos en Leaguepedia.
 */
export function Roster2027() {
  const { resolve, move, revert, imports, addImport, removeImport, reset, movementCount, exportJson } =
    useProjections();
  const { t, roleLabel } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetId>(null);
  const [poolQuery, setPoolQuery] = useState('');
  const [poolRole, setPoolRole] = useState<Role | ''>('');
  const [staffQuery, setStaffQuery] = useState('');

  const importedPlayers = useMemo(() => imports.map(importedToPlayer), [imports]);
  const players27 = useMemo<Player[]>(
    () => [...players.filter((p) => !p.isCoach), ...importedPlayers.filter((p) => p.role !== 'coach')],
    [importedPlayers],
  );
  const staff27 = useMemo<Player[]>(
    () => [...players.filter((p) => p.isCoach), ...importedPlayers.filter((p) => p.role === 'coach')],
    [importedPlayers],
  );
  const allIds = useMemo(
    () => new Set([...players27, ...staff27].map((p) => p.id)),
    [players27, staff27],
  );

  const groupTree = useCallback(
    (list: Player[]) => {
      const map = new Map<string, Player[]>(teams.map((team) => [team.id, [] as Player[]]));
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
    [resolve],
  );

  const { map: byTeam, pool } = useMemo(() => groupTree(players27), [groupTree, players27]);
  const { map: byTeamStaff, pool: poolStaff } = useMemo(() => groupTree(staff27), [groupTree, staff27]);

  const filteredPool = useMemo(() => {
    const query = norm(poolQuery.trim());
    return pool.filter(
      (p) =>
        (poolRole === '' || p.role === poolRole) &&
        (query === '' || norm(p.name).includes(query) || norm(p.realName).includes(query)),
    );
  }, [pool, poolQuery, poolRole]);

  const filteredStaffPool = useMemo(() => {
    const query = norm(staffQuery.trim());
    return poolStaff.filter((p) => query === '' || norm(p.name).includes(query));
  }, [poolStaff, staffQuery]);

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
    <section aria-label="Roster proyectado 2027">
      {/* Barra propia de la vista (sustituye a la de filtros) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline pb-3">
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
      <LeaguepediaSearch
        knownIds={allIds}
        onAdd={(imported) => {
          addImport(imported);
          setPoolQuery(''); // que el nuevo jugador sea visible en su pool
          setPoolRole('');
          setStaffQuery('');
        }}
      />

      {/* Árbol de equipos (misma retícula 2×5 que la parrilla) */}
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
          <div className="ml-auto flex items-center gap-2">
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

      {/* Sección Staff 2027: misma mecánica que el árbol de jugadores */}
      <div className="mt-8">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3 className="text-title-md font-bold uppercase text-ink">{t('r27.staffTitle')}</h3>
          <p className="text-caption text-muted">{t('r27.staffHint')}</p>
          <p className="ml-auto text-caption text-muted" aria-live="polite">
            {t('r27.staffCount', { n: poolStaff.length })}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {teams.map((team) => (
            <TeamColumn
              key={team.id}
              scope="staff"
              team={team}
              members={byTeamStaff.get(team.id) ?? []}
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

        <div
          onDragOver={dragOver('staff:pool')}
          onDragLeave={dragLeave('staff:pool')}
          onDrop={onDrop('staff:pool')}
          className={`mt-4 border border-dashed border-hairline bg-soft p-3 ${
            dropTarget === 'staff:pool' ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas' : ''
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => headerClick('staff:pool')}
              aria-label={selectedId ? t('r27.staffMoveAria') : t('r27.staffPoolAria')}
              className="block text-left"
            >
              <span className="text-body-sm font-bold uppercase text-ink">{t('r27.staffPool')}</span>
              <span className="ml-3 text-caption text-muted">{t('r27.staffPoolHint')}</span>
            </button>
            <input
              type="search"
              value={staffQuery}
              onChange={(event) => setStaffQuery(event.target.value)}
              placeholder={t('r27.staffFilterPlaceholder')}
              aria-label={t('r27.staffFilterAria')}
              className="ml-auto h-8 w-44 border border-hairline bg-card px-2.5 text-caption text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {filteredStaffPool.map((player) => (
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
            {filteredStaffPool.length === 0 && (
              <li className="text-caption text-muted">
                {poolStaff.length === 0 ? t('r27.poolEmpty') : t('r27.filterNoResults')}
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

interface TeamColumnProps {
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
function TeamColumn({
  scope,
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
          <span className="text-caption font-semibold text-muted">{members.length}</span>
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
function TeamLogo({ team }: { team: Team }) {
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
      className="h-6 w-6 shrink-0 object-contain"
    />
  );
}

interface MemberNodeProps {
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
function MemberNode({ player, teamId, info, selected, onSelect, onSendToPool, onRevert, onRemoveImport }: MemberNodeProps) {
  const { t } = useI18n();
  const origin = info.originTeamId ? getTeam(info.originTeamId) : null;
  const origin26 = player.teamId ? getTeam(player.teamId) : null;
  const date = formatDate(player.contractEnd);
  const estimated = isEstimatedDate(player) && date !== null;
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
          <span className={`truncate text-caption ${badgeTone}`}>
            {estimated && (
              <span aria-hidden="true" className="mr-0.5">
                ≈
              </span>
            )}
            {badge}
            {estimated && <span className="sr-only"> {t('player.estimatedSr')}</span>}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
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

interface PoolNodeProps {
  player: Player;
  info: Projection27;
  selected: boolean;
  onSelect: (playerId: string) => void;
  onRevert: () => void;
  onRemoveImport: (importedId: string) => void;
}

/** Nodo del pool: chip compacto con el motivo (expira 2026, salida, sin fecha). */
function PoolNode({ player, info, selected, onSelect, onRevert, onRemoveImport }: PoolNodeProps) {
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
