import { teams } from '../data/players';
import { useI18n } from '../i18n';

interface TeamSelectProps {
  value: string;
  onChange: (teamId: string) => void;
  className?: string;
}

/** Select único de equipo: "Todos" + los 10 equipos canónicos del Sheet. */
export function TeamSelect({ value, onChange, className = '' }: TeamSelectProps) {
  const { t } = useI18n();

  return (
    <select
      aria-label={t('filter.teamAria')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-12 border border-hairline bg-card px-3 text-body-md text-ink focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    >
      <option value="">{t('filter.teamAll')}</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
