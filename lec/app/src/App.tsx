import { useCallback, useMemo } from 'react';
import { EmptyState } from './components/EmptyState';
import { FilterBar } from './components/FilterBar';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MarketView } from './components/MarketView';
import { PlayerDrawer } from './components/PlayerDrawer';
import { PlayerTable } from './components/PlayerTable';
import { Roster2027 } from './components/Roster2027';
import { Staff2027 } from './components/Staff2027';
import { TeamGrid } from './components/TeamGrid';
import { players, teams } from './data/players';
import { buildGridGroups, passesFilters } from './lib/filters';
import { sortPlayers, type SortKey } from './lib/sort';
import { useTheme } from './hooks/useTheme';
import { useUrlState } from './hooks/useUrlState';

/**
 * Scouting LEC 2026 — dashboard de rosters y contratos (PLAN.md M1–M3).
 * Estado único de filtros/vista/orden en la URL (useUrlState); el navegador
 * solo consume JSON local y los assets están commiteados.
 */
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [state, update] = useUrlState();
  // La ficha abierta vive en la URL (?player=id): deep-link y atrás/adelante gratis.
  const selectedPlayerId = state.player;

  const handleSort = useCallback(
    (key: SortKey) => {
      update({
        sortKey: key,
        sortDir: state.sortKey === key && state.sortDir === 'asc' ? 'desc' : 'asc',
      });
    },
    [state.sortKey, state.sortDir, update],
  );

  const clearFilters = useCallback(() => {
    update({ q: '', team: '', role: '', agent: '', expiring2026: false, player: null });
  }, [update]);

  // Liga activa: scopea Inicio/Tabla/2027/Staff 2027 (Mercado es LEC).
  const league = state.league;
  const leaguePlayers = useMemo(
    () => players.filter((p) => p.league === league),
    [league],
  );

  // Vista tabla: filtros AND completos (el filtro de agente aísla) + orden.
  const tablePlayers = useMemo(
    () => sortPlayers(passesFilters(leaguePlayers, state), state.sortKey, state.sortDir),
    [leaguePlayers, state],
  );

  // Vista parrilla: agrupado por equipo (el filtro de agente resalta, no aísla).
  const { groups, matchCount: gridMatchCount } = useMemo(
    () => buildGridGroups(leaguePlayers, teams, state),
    [leaguePlayers, state],
  );

  const view = state.view;
  const matchCount = view === 'grid' ? gridMatchCount : tablePlayers.length;
  const isEmpty = matchCount === 0;
  const selectedPlayer = selectedPlayerId ? (players.find((p) => p.id === selectedPlayerId) ?? null) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        view={view}
        onViewChange={(v) => update({ view: v })}
        onGoHome={() => update({ view: 'grid', q: '', team: '', role: '', agent: '', expiring2026: false, player: null })}
      />

      <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 md:py-8">
        {view === 'roster2027' ? (
          <Roster2027 league={league} onLeagueChange={(l) => update({ league: l })} />
        ) : view === 'staff2027' ? (
          <Staff2027 league={league} onLeagueChange={(l) => update({ league: l })} />
        ) : view === 'market' ? (
          <MarketView />
        ) : (
          <>
            <FilterBar state={state} update={update} matchCount={matchCount} total={leaguePlayers.length} />

            {isEmpty ? (
              <EmptyState onClear={clearFilters} />
            ) : view === 'grid' ? (
              <TeamGrid
                groups={groups}
                agentActive={state.agent !== ''}
                onSelect={(id) => update({ player: id })}
              />
            ) : (
              <PlayerTable
                players={tablePlayers}
                sortKey={state.sortKey}
                sortDir={state.sortDir}
                onSort={handleSort}
                onSelect={(id) => update({ player: id })}
              />
            )}
          </>
        )}
      </main>

      <Footer />

      {selectedPlayer && <PlayerDrawer player={selectedPlayer} onClose={() => update({ player: null })} />}
    </div>
  );
}
