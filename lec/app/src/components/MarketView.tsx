import { useMemo } from 'react';
import { agents, players, teams } from '../data/players';
import { useI18n } from '../i18n';
import { assetUrl } from '../lib/assets';
import { flagImg } from '../lib/format';

/**
 * Vista "Mercado": bloques de solo lectura sobre los JUGADORES LEC
 * (isCoach === false, los coaches van aparte en la vista Staff 2027):
 *  a) barras apiladas por equipo según el año de fin de contrato,
 *  b) nº de contratos que terminan en 2026 (agentes libres para 2027),
 *  c) nacionalidades del roster como tarjetas con bandera,
 *  d) nota media por equipo con marcador de la media de la liga,
 *  e) representantes con más clientes y jugadores sin representación,
 *  f) tramos de duración restante de contrato (días hasta el fin),
 *  g) extremos de la nota: top 5 y bottom 5.
 * Sin librería de charts: barras con divs y los tokens de las guías de diseño.
 */

/** Cubos de año de fin de contrato para un equipo. */
interface ExpiryBuckets {
  y2026: number;
  y2027: number;
  y2028plus: number;
  unknown: number;
  total: number;
}

interface TeamExpiry {
  teamId: string;
  teamName: string;
  buckets: ExpiryBuckets;
}

interface NationalityCount {
  code: string;
  count: number;
}

/** Año ISO → cubo; "2028+" agrupa >= 2028 y sin fecha válida va a desconocido. */
function bucketOf(contractEnd: string | null): keyof Omit<ExpiryBuckets, 'total'> {
  if (!contractEnd) return 'unknown';
  const year = Number(contractEnd.slice(0, 4));
  if (year === 2026) return 'y2026';
  if (year === 2027) return 'y2027';
  if (year >= 2028) return 'y2028plus';
  return 'unknown';
}

interface TeamAvgRating {
  teamId: string;
  teamName: string;
  /** Media 0-10 o null si el equipo no tiene ningún jugador con nota. */
  avg: number | null;
  ratedCount: number;
}

interface AgentClientCount {
  id: string;
  name: string;
  type: 'agent' | 'agency';
  clients: number;
}

/** Tramos de días restantes hasta el fin de contrato (bloque f). */
interface DurationBuckets {
  lt3: number;
  m3to6: number;
  m6to12: number;
  gt12: number;
  total: number;
}

interface RatedPlayer {
  id: string;
  name: string;
  rating: number;
}

/**
 * Color del relleno según la nota media del equipo (bloque d): mismos cortes
 * que el anillo de PlayerCard salvo el azul élite, que se reserva a notas
 * individuales: verde >= 5, ámbar >= 4, rojo por debajo.
 */
function teamAvgColorOf(avg: number): string {
  if (avg >= 5) return 'var(--success)';
  if (avg >= 4) return 'var(--warning)';
  return 'var(--danger)';
}

/** Color del texto de una nota individual (bloque g): azul élite >= 7. */
function ratingTextColorOf(rating: number): string {
  if (rating >= 7) return 'var(--m-blue-dark)';
  return teamAvgColorOf(rating);
}

/** Tramo de días restantes: < 3 meses, 3-6, 6-12 y > 12 (mes = 30.44 días). */
function durationBucketOf(days: number): keyof Omit<DurationBuckets, 'total'> {
  if (days < 91) return 'lt3';
  if (days < 183) return 'm3to6';
  if (days < 365) return 'm6to12';
  return 'gt12';
}

export function MarketView() {
  const { t } = useI18n();

  // Mercado es una vista LEC: fija la liga independientemente del selector.
  const leaguePlayers = useMemo(() => players.filter((p) => p.league === 'lec'), []);
  const leagueTeams = useMemo(() => teams.filter((team) => team.league === 'lec'), []);
  const leaguePlayerIds = useMemo(() => new Set(leaguePlayers.map((p) => p.id)), [leaguePlayers]);

  // Bloques a y b: agrupación por equipo en el orden canónico del Sheet (data/teams.json).
  const expiries = useMemo<TeamExpiry[]>(
    () =>
      leagueTeams.map((team) => {
        const buckets: ExpiryBuckets = { y2026: 0, y2027: 0, y2028plus: 0, unknown: 0, total: 0 };
        for (const p of leaguePlayers) {
          if (p.isCoach || p.teamId !== team.id) continue;
          buckets[bucketOf(p.contractEnd)] += 1;
          buckets.total += 1;
        }
        return { teamId: team.id, teamName: team.name, buckets };
      }),
    [leaguePlayers, leagueTeams],
  );

  const free2026ByTeam = useMemo(
    () => expiries.map((e) => ({ ...e, free: e.buckets.y2026 })),
    [expiries],
  );
  const free2026Total = useMemo(
    () => leaguePlayers.filter((p) => !p.isCoach && p.contractEnd !== null && p.contractEnd.startsWith('2026')).length,
    [leaguePlayers],
  );

  // Bloque c: nacionalidades de los jugadores, descendente (empates por código).
  const nationalities = useMemo<NationalityCount[]>(() => {
    const counts = new Map<string, number>();
    for (const p of leaguePlayers) {
      if (p.isCoach || !p.nationality) continue;
      counts.set(p.nationality, (counts.get(p.nationality) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }, [leaguePlayers]);

  const maxFree = Math.max(...free2026ByTeam.map((e) => e.free), 1);

  // Bloque d: media de la nota 2026 por equipo, descendente; sin nota → null.
  const teamAvgRatings = useMemo<TeamAvgRating[]>(() => {
    const rows = leagueTeams.map((team) => {
      const rated = leaguePlayers.filter((p) => !p.isCoach && p.teamId === team.id && p.rating !== null);
      const avg =
        rated.length === 0
          ? null
          : rated.reduce((sum, p) => sum + (p.rating as number), 0) / rated.length;
      return { teamId: team.id, teamName: team.name, avg, ratedCount: rated.length };
    });
    // Los equipos sin nota (avg null) quedan siempre al final, por orden canónico.
    return rows.sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  }, [leaguePlayers, leagueTeams]);

  // Media de la liga sobre los jugadores con nota (el propio dataset da 5.00
  // por estandarización, pero se calcula de verdad por si cambia la muestra).
  const leagueAvg = useMemo(() => {
    const rated = leaguePlayers.filter((p) => !p.isCoach && p.rating !== null);
    if (rated.length === 0) return 5;
    return rated.reduce((sum, p) => sum + (p.rating as number), 0) / rated.length;
  }, [leaguePlayers]);

  // Bloque e: representantes ordenados por nº de clientes (desc; empates por
  // nombre) y jugadores sin representación conocida (su id no está en ningún
  // agents[].playerIds — el filtro es sobre el índice derivado, como getAgent).
  const topAgents = useMemo<AgentClientCount[]>(() => {
    return agents
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        clients: a.playerIds.filter((id) => leaguePlayerIds.has(id)).length,
      }))
      .filter((a) => a.clients > 0)
      .sort((a, b) => b.clients - a.clients || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [leaguePlayerIds]);

  const unrepresented = useMemo(() => {
    const covered = new Set<string>();
    for (const a of agents) for (const id of a.playerIds) covered.add(id);
    return leaguePlayers.filter((p) => !p.isCoach && !covered.has(p.id)).length;
  }, [leaguePlayers]);
  const fieldPlayerTotal = useMemo(() => leaguePlayers.filter((p) => !p.isCoach).length, [leaguePlayers]);
  const maxAgentClients = Math.max(...topAgents.map((a) => a.clients), 1);

  // Bloque f: días restantes hasta el fin de contrato agrupados en tramos.
  // Se usa new Date() en runtime a propósito: es una vista viva y los tramos
  // caducan con el calendario (no hay fecha "de hoy" inyectada por el build).
  const durations = useMemo<DurationBuckets>(() => {
    const today = new Date();
    const buckets: DurationBuckets = { lt3: 0, m3to6: 0, m6to12: 0, gt12: 0, total: 0 };
    for (const p of leaguePlayers) {
      if (p.isCoach || !p.contractEnd) continue;
      const days = Math.round(
        (new Date(`${p.contractEnd}T00:00:00`).getTime() - today.getTime()) / 86_400_000,
      );
      buckets[durationBucketOf(days)] += 1;
      buckets.total += 1;
    }
    return buckets;
  }, [leaguePlayers]);

  // Bloque g: top 5 y bottom 5 de la nota (desc). El bottom se invierte para
  // numerar del peor (1º) al 5º peor, como un ranking invertido.
  const extremeRatings = useMemo<{ top: RatedPlayer[]; bottom: RatedPlayer[] }>(() => {
    const rated = leaguePlayers
      .filter((p) => !p.isCoach && p.rating !== null)
      .map((p) => ({ id: p.id, name: p.name, rating: p.rating as number }))
      .sort((a, b) => b.rating - a.rating);
    return { top: rated.slice(0, 5), bottom: rated.slice(-5).reverse() };
  }, [leaguePlayers]);

  return (
    <section aria-label={t('market.title')}>
      {/* Cabecera de la vista (mismo patrón que Roster2027) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline pb-3">
        <div className="min-w-0">
          <h2 className="text-title-md font-bold uppercase text-ink">{t('market.title')}</h2>
          <p className="text-caption text-muted">{t('market.hint')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 pt-6">
        {/* a) Fin de contratos por equipo */}
        <div className="border border-hairline bg-card p-4 md:p-6">
          <h3 className="text-title-md font-bold text-ink">{t('market.block1Title')}</h3>
          <p className="text-caption text-muted">{t('market.block1Subtitle')}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {expiries.map(({ teamId, teamName, buckets }) => (
              <li key={teamId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-body-sm text-ink sm:w-36">
                  {teamName}
                </span>
                <div
                  role="img"
                  aria-label={t('market.block1Aria', {
                    team: teamName,
                    a: buckets.y2026,
                    b: buckets.y2027,
                    c: buckets.y2028plus,
                  }) + (buckets.unknown > 0 ? t('market.ariaUnknownSuffix', { n: buckets.unknown }) : '')}
                  className="flex h-6 flex-1 overflow-hidden"
                >
                  {buckets.total === 0 ? (
                    <div className="h-full flex-1 bg-soft" />
                  ) : (
                    (['y2026', 'y2027', 'y2028plus', 'unknown'] as const).map((key) => {
                      const count = buckets[key];
                      if (count === 0) return null;
                      const color =
                        key === 'y2026'
                          ? 'var(--warning)'
                          : key === 'y2027'
                            ? 'var(--success)'
                            : key === 'y2028plus'
                              ? 'var(--accent)'
                              : 'var(--muted)';
                      return (
                        <div
                          key={key}
                          style={{
                            backgroundColor: color,
                            width: `${(count / buckets.total) * 100}%`,
                          }}
                          className="flex h-full min-w-6 items-center justify-center"
                        >
                          <span
                            className="text-caption font-bold"
                            style={{ color: key === 'y2026' ? 'var(--on-warning)' : 'var(--on-dark)' }}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            {(['2026', '2027', '2028', 'unknown'] as const).map((key) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5"
                  style={{
                    backgroundColor:
                      key === '2026'
                        ? 'var(--warning)'
                        : key === '2027'
                          ? 'var(--success)'
                          : key === '2028'
                            ? 'var(--accent)'
                            : 'var(--muted)',
                  }}
                />
                <span className="text-caption text-muted">{t(`market.legend.${key}`)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* b) Agentes libres en 2026 por equipo */}
        <div className="border border-hairline bg-card p-4 md:p-6">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <h3 className="text-title-md font-bold text-ink">{t('market.block2Title')}</h3>
            <p className="text-caption font-bold text-ink" aria-live="polite">
              {t('market.block2Total', { n: free2026Total })}
            </p>
          </div>
          <p className="text-caption text-muted">{t('market.block2Subtitle')}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {free2026ByTeam.map(({ teamId, teamName, free }) => (
              <li key={teamId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-body-sm text-ink sm:w-36">
                  {teamName}
                </span>
                <div
                  role="img"
                  aria-label={t('market.block2Aria', { team: teamName, n: free })}
                  className="h-6 flex-1 bg-soft"
                >
                  {free > 0 && (
                    <div
                      style={{ backgroundColor: 'var(--warning)', width: `${(free / maxFree) * 100}%` }}
                      className="flex h-full items-center justify-end pr-1"
                    >
                      <span className="text-caption font-bold" style={{ color: 'var(--on-warning)' }}>
                        {free}
                      </span>
                    </div>
                  )}
                </div>
                {free === 0 && <span className="sr-only">0</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* c) Nacionalidades del roster */}
        <div className="border border-hairline bg-card p-4 md:p-6">
          <h3 className="text-title-md font-bold text-ink">{t('market.block3Title')}</h3>
          <p className="text-caption text-muted">{t('market.block3Subtitle')}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {nationalities.map(({ code, count }) => {
              const flag = flagImg(code);
              return (
                <li
                  key={code}
                  className="flex items-center gap-2 border border-hairline bg-soft px-3 py-2"
                >
                  {flag && (
                    <img
                      src={assetUrl(flag)}
                      alt=""
                      width={20}
                      height={14}
                      loading="lazy"
                      className="h-3.5 w-auto"
                    />
                  )}
                  <span className="text-caption font-bold uppercase text-ink">{code}</span>
                  <span className="text-caption text-muted">{count}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* d) Nota media por equipo (con marcador de la media de la liga) */}
        <div className="border border-hairline bg-card p-4 md:p-6">
          <h3 className="text-title-md font-bold text-ink">{t('market.block4Title')}</h3>
          <p className="text-caption text-muted">{t('market.block4Subtitle')}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {teamAvgRatings.map(({ teamId, teamName, avg, ratedCount }) => (
              <li key={teamId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-body-sm text-ink sm:w-36">
                  {teamName}
                </span>
                {avg === null ? (
                  <>
                    <div className="h-6 flex-1 bg-soft" />
                    <span className="w-14 shrink-0 text-right text-caption text-muted">
                      {t('market.block4NoData')}
                    </span>
                  </>
                ) : (
                  <>
                    <div
                      role="img"
                      aria-label={t('market.block4Aria', {
                        team: teamName,
                        avg: avg.toFixed(2),
                        n: ratedCount,
                      })}
                      className="relative h-6 flex-1 bg-soft"
                    >
                      {/* Marcador vertical de la media de la liga (línea de 2px) */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 w-0.5 bg-ink/50"
                        style={{ left: `${leagueAvg * 10}%` }}
                      />
                      <div
                        style={{
                          backgroundColor: teamAvgColorOf(avg),
                          width: `${(avg / 10) * 100}%`,
                        }}
                        className="h-full"
                      />
                    </div>
                    <span
                      className="w-14 shrink-0 text-right text-body-sm font-bold"
                      style={{ color: teamAvgColorOf(avg) }}
                    >
                      {avg.toFixed(2)}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5" style={{ backgroundColor: 'var(--success)' }} />
              <span className="text-caption text-muted">≥ 5</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5" style={{ backgroundColor: 'var(--warning)' }} />
              <span className="text-caption text-muted">4 – 4.99</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5" style={{ backgroundColor: 'var(--danger)' }} />
              <span className="text-caption text-muted">&lt; 4</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-ink/50" />
              <span className="text-caption text-muted">
                {t('market.block4LeagueAvg', { avg: leagueAvg.toFixed(2) })}
              </span>
            </span>
          </div>
        </div>

        {/* e) Agentes y agencias (top clientes + sin representación) */}
        <div className="border border-hairline bg-card p-4 md:p-6">
          <h3 className="text-title-md font-bold text-ink">{t('market.block5Title')}</h3>
          <p className="text-caption text-muted">{t('market.block5Subtitle')}</p>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {/* Columna 1: top 8 representantes por nº de clientes */}
            <div>
              <p className="text-caption font-bold uppercase text-muted">
                {t('market.block5ListAria', { n: topAgents.length })}
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {topAgents.map(({ id, name, type, clients }) => (
                  <li key={id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-body-sm text-ink sm:w-44" title={name}>
                      {name}
                    </span>
                    <div
                      role="img"
                      aria-label={t('market.block5BarAria', { name, n: clients })}
                      className="flex h-6 flex-1 items-center bg-soft"
                    >
                      <div
                        style={{
                          backgroundColor: 'var(--accent)',
                          width: `${(clients / maxAgentClients) * 100}%`,
                        }}
                        className="flex h-full items-center justify-end pr-1"
                      >
                        <span className="text-caption font-bold" style={{ color: 'var(--on-dark)' }}>
                          {clients}
                        </span>
                      </div>
                    </div>
                    <span className="w-16 shrink-0 border border-hairline bg-soft px-1 py-0.5 text-center text-caption text-muted">
                      {t(type === 'agency' ? 'market.block5TypeAgency' : 'market.block5TypeAgent')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Columna 2: cifra grande de jugadores sin representación conocida */}
            <div className="flex flex-col justify-center border-t border-hairline pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <p
                className="flex items-baseline gap-2"
                role="img"
                aria-label={t('market.block5UnrepresentedAria', { n: unrepresented, total: fieldPlayerTotal })}
              >
                <span className="text-display-sm font-bold text-ink">{unrepresented}</span>
                <span className="text-caption font-bold uppercase text-muted">
                  {t('market.block5UnrepresentedLabel')}
                </span>
              </p>
              <p className="mt-2 text-caption text-muted">
                {t('market.block5UnrepresentedHint', { total: fieldPlayerTotal })}
              </p>
            </div>
          </div>
        </div>

        {/* f) Duración de contrato restante (tramos por días hasta el fin) */}
        <div className="border border-hairline bg-card p-4 md:p-6">
          <h3 className="text-title-md font-bold text-ink">{t('market.block6Title')}</h3>
          <p className="text-caption text-muted">{t('market.block6Subtitle')}</p>
          <div
            role="img"
            aria-label={t('market.block6Aria', {
              lt3: durations.lt3,
              m3to6: durations.m3to6,
              m6to12: durations.m6to12,
              gt12: durations.gt12,
            })}
            className="mt-4 flex h-6 overflow-hidden"
          >
            {durations.total === 0 ? (
              <div className="h-full flex-1 bg-soft" />
            ) : (
              (['lt3', 'm3to6', 'm6to12', 'gt12'] as const).map((key) => {
                const count = durations[key];
                if (count === 0) return null;
                const color =
                  key === 'lt3'
                    ? 'var(--danger)'
                    : key === 'm3to6'
                      ? 'var(--warning)'
                      : key === 'm6to12'
                        ? 'var(--success)'
                        : 'var(--accent)';
                return (
                  <div
                    key={key}
                    style={{ backgroundColor: color, width: `${(count / durations.total) * 100}%` }}
                    className="flex h-full min-w-6 items-center justify-center"
                  >
                    <span className="text-caption font-bold" style={{ color: 'var(--on-dark)' }}>
                      {count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            {(
              [
                ['lt3', 'market.block6LegendLt3'],
                ['m3to6', 'market.block6Legend3to6'],
                ['m6to12', 'market.block6Legend6to12'],
                ['gt12', 'market.block6LegendGt12'],
              ] as const
            ).map(([key, legendKey]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5"
                  style={{
                    backgroundColor:
                      key === 'lt3'
                        ? 'var(--danger)'
                        : key === 'm3to6'
                          ? 'var(--warning)'
                          : key === 'm6to12'
                            ? 'var(--success)'
                            : 'var(--accent)',
                  }}
                />
                <span className="text-caption text-muted">{t(legendKey)}</span>
              </span>
            ))}
            <span className="text-caption text-muted">({durations.total})</span>
          </div>
        </div>

        {/* g) Ratings extremos: top 5 y bottom 5 de la nota */}
        <div className="border border-hairline bg-card p-4 md:p-6">
          <h3 className="text-title-md font-bold text-ink">{t('market.block7Title')}</h3>
          <p className="text-caption text-muted">{t('market.block7Subtitle')}</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {(
              [
                ['top', extremeRatings.top],
                ['bottom', extremeRatings.bottom],
              ] as const
            ).map(([key, list]) => (
              <div key={key}>
                <p className="text-caption font-bold uppercase text-muted">
                  {key === 'top' ? t('market.block7Top') : t('market.block7Bottom')}
                </p>
                <ol className="mt-2 flex flex-col gap-1">
                  {list.map(({ id, name, rating }, index) => (
                    <li
                      key={id}
                      aria-label={t('market.block7RowAria', { pos: index + 1, name, rating: rating.toFixed(2) })}
                      className="flex items-center gap-3 border-b border-hairline py-1.5 last:border-b-0"
                    >
                      <span className="w-5 shrink-0 text-caption font-bold text-muted">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{name}</span>
                      <span
                        className="shrink-0 text-body-sm font-bold"
                        style={{ color: ratingTextColorOf(rating) }}
                      >
                        {rating.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
