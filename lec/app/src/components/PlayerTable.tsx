import { getAgent, getTeam } from '../data/players';
import type { SortDir, SortKey } from '../lib/sort';
import { formatDate, flagImg, isEstimatedDate } from '../lib/format';
import { assetUrl } from '../lib/assets';
import type { Player } from '../types/player';
import { useI18n } from '../i18n';
import { contractState } from '../lib/contract';
import { ContractBadge } from './ContractBadge';
import { PlayerPhoto } from './PlayerPhoto';
import { RoleIcon } from './RoleIcon';
import { SortHeader } from './SortHeader';

interface PlayerTableProps {
  players: Player[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onSelect: (playerId: string) => void;
}

const HEAD_CLASS = 'hidden md:table-cell';

/**
 * Vista tabla: lista plana ordenable (por defecto, fin de contrato ascendente
 * con unknown al final). Filas de 48px con hairlines. En móvil se ocultan las
 * columnas secundarias para evitar scroll horizontal a 375px.
 */
export function PlayerTable({ players, sortKey, sortDir, onSort, onSelect }: PlayerTableProps) {
  const { t, roleLabel } = useI18n();

  return (
    <div data-export-root className="mt-6 overflow-x-auto border border-hairline">
      <table className="w-full border-collapse bg-canvas text-body-sm">
        <thead>
          <tr>
            <SortHeader label={t('table.player')} sortKey="name" sortKeyActive={sortKey} sortDirActive={sortDir} onSort={onSort} />
            <SortHeader
              label={t('table.team')}
              sortKey="team"
              sortKeyActive={sortKey}
              sortDirActive={sortDir}
              onSort={onSort}
              className={HEAD_CLASS}
            />
            <SortHeader label={t('table.role')} sortKey="role" sortKeyActive={sortKey} sortDirActive={sortDir} onSort={onSort} />
            <SortHeader
              label={t('table.contractEnd')}
              sortKey="contractEnd"
              sortKeyActive={sortKey}
              sortDirActive={sortDir}
              onSort={onSort}
            />
            {/* Estado es derivado de la fecha: no ordena por sí mismo. */}
            <th
              scope="col"
              className="hidden h-12 border-b border-hairline px-3 text-left font-normal sm:table-cell"
            >
              <span className="text-label-uppercase uppercase text-muted">{t('table.status')}</span>
            </th>
            <SortHeader
              label={t('table.agent')}
              sortKey="agent"
              sortKeyActive={sortKey}
              sortDirActive={sortDir}
              onSort={onSort}
              className={HEAD_CLASS}
            />
            <SortHeader
              label={t('table.rating')}
              sortKey="rating"
              sortKeyActive={sortKey}
              sortDirActive={sortDir}
              onSort={onSort}
              className="hidden sm:table-cell"
            />
            <SortHeader
              label={t('table.nationality')}
              sortKey="nationality"
              sortKeyActive={sortKey}
              sortDirActive={sortDir}
              onSort={onSort}
              className="hidden lg:table-cell"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {players.map((player) => {
            const team = getTeam(player.teamId);
            const agent = getAgent(player.agentId);
            const flag = flagImg(player.nationality);
            const date = formatDate(player.contractEnd);
            const estimated = isEstimatedDate(player) && date !== null;
            const state = contractState(player);

            return (
              <tr key={player.id} className="hover:bg-soft">
                <td className="h-12 px-3">
                  <button
                    type="button"
                    onClick={() => onSelect(player.id)}
                    className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <PlayerPhoto player={player} size={32} />
                    <span className="max-w-[180px] truncate font-semibold text-ink hover:underline hover:decoration-accent hover:underline-offset-4">
                      {player.name}
                    </span>
                  </button>
                </td>
                <td className={`h-12 px-3 ${HEAD_CLASS}`}>
                  <span className="flex items-center gap-2 whitespace-nowrap text-body">
                    {team ? (
                      <>
                        {team.logo ? (
                          <img
                            src={assetUrl(team.logo)}
                            alt=""
                            width={24}
                            height={24}
                            loading="lazy"
                            className={`h-5 w-5 shrink-0 object-contain ${team.mono ? `team-logo--mono-${team.mono}` : ''}`}
                          />
                        ) : (
                          <span className="text-caption font-bold uppercase text-muted">{team.abbreviation}</span>
                        )}
                        <span className="hidden xl:inline text-muted">{team.name}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </td>
                <td className="h-12 px-3">
                  <span className="flex items-center gap-2">
                    <RoleIcon role={player.role} size={18} />
                    <span className="hidden whitespace-nowrap text-body sm:inline">{roleLabel(player.role)}</span>
                  </span>
                </td>
                <td className="h-12 whitespace-nowrap px-3 text-body">
                  {date ?? '—'}
                  {estimated && (
                    <>
                      <span aria-hidden="true" className="ml-1 text-muted">
                        ≈
                      </span>
                      <span className="sr-only"> {t('player.estimatedSr')}</span>
                    </>
                  )}
                </td>
                <td className="hidden h-12 px-3 sm:table-cell">
                  {state === 'long' ? (
                    <span className="text-caption text-muted">—</span>
                  ) : (
                    <ContractBadge state={state} compact />
                  )}
                </td>
                <td className={`h-12 whitespace-nowrap px-3 text-body ${HEAD_CLASS}`}>
                  {agent?.name ?? '—'}
                </td>
                <td className="hidden h-12 whitespace-nowrap px-3 text-body sm:table-cell">
                  {player.rating != null ? player.rating.toFixed(2) : '—'}
                </td>
                <td className="hidden h-12 whitespace-nowrap px-3 text-body lg:table-cell">
                  {flag ? (
                    <span className="flex items-center gap-1.5">
                      <img src={assetUrl(flag)} alt="" width={20} height={14} loading="lazy" className="h-3.5 w-auto" />
                      {player.nationality}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
