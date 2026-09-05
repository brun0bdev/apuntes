import { teams } from '../data/players';
import type { League } from '../types/player';
import { useI18n } from '../i18n';

interface TeamSelectProps {
  value: string;
  onChange: (teamId: string) => void;
  /** Liga activa: solo lista los equipos de esa liga. */
  league: League;
  className?: string;
}

/** Select único de equipo: "Todos" + los equipos canónicos de la liga activa. */
export function TeamSelect({ value, onChange, league, className = '' }: TeamSelectProps) {
  const { t } = useI18n();
  const leagueTeams = teams.filter((team) => team.league === league);

  return (
    <select
      aria-label={t('filter.teamAria')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 border border-hairline bg-card px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    >
      <option value="">{t('filter.teamAll')}</option>
      {leagueTeams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
