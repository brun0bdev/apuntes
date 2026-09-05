import type { LeagueKind } from '../hooks/useUrlState';
import { useI18n } from '../i18n';

interface LeagueSelectProps {
  value: LeagueKind;
  onChange: (league: LeagueKind) => void;
}

const LEAGUES: ReadonlyArray<{ value: LeagueKind; label: string }> = [
  { value: 'lec', label: 'LEC' },
  { value: 'lcs', label: 'LCS' },
];

/**
 * Selector LEC/LCS (grupo de chips single-select, mismo patrón que RoleChips).
 * Scopea las vistas de rosters y la 2027 a una liga; Mercado y Tracking no lo
 * llevan porque son específicos LEC.
 */
export function LeagueSelect({ value, onChange }: LeagueSelectProps) {
  const { t } = useI18n();

  return (
    <div role="group" aria-label={t('league.aria')} className="flex flex-wrap items-center gap-2">
      {LEAGUES.map((league) => (
        <button
          key={league.value}
          type="button"
          aria-pressed={value === league.value}
          onClick={() => onChange(league.value)}
          className={`h-10 whitespace-nowrap border px-3 text-caption font-bold transition-colors ${
            value === league.value
              ? 'border-ink bg-ink text-canvas'
              : 'border-hairline bg-canvas text-body hover:bg-soft hover:text-ink'
          }`}
        >
          {league.label}
        </button>
      ))}
    </div>
  );
}
