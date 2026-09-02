import { agents } from '../data/players';
import { NO_AGENT } from '../lib/filters';
import { useI18n } from '../i18n';

interface AgentSelectProps {
  value: string;
  onChange: (agentId: string) => void;
  className?: string;
}

/**
 * Filtro de agente/agencia a partir de data/agents.json (ordenado por nº de
 * clientes desc, PLAN.md §3). Con el índice vacío se muestra deshabilitado con
 * estado "Sin agentes definidos" + hint, nunca roto. La opción especial
 * NO_AGENT permite aislar a los jugadores sin representante.
 */
export function AgentSelect({ value, onChange, className = '' }: AgentSelectProps) {
  const { t } = useI18n();

  if (agents.length === 0) {
    return (
      <div className={className}>
        <select
          aria-label={t('filter.agentEmptyAria')}
          disabled
          value=""
          className="h-12 w-full cursor-not-allowed border border-hairline bg-soft px-3 text-body-md text-muted sm:w-auto"
        >
          <option value="">{t('filter.agentEmpty')}</option>
        </select>
        <p className="mt-1 text-caption text-muted-soft">{t('filter.agentHint')}</p>
      </div>
    );
  }

  const sorted = [...agents].sort(
    (a, b) => b.playerIds.length - a.playerIds.length || a.name.localeCompare(b.name, 'es'),
  );

  return (
    <select
      aria-label={t('filter.agentAria')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-12 w-full border border-hairline bg-card px-3 text-body-md text-ink focus-visible:outline-2 focus-visible:outline-accent sm:w-auto ${className}`}
    >
      <option value="">{t('filter.agentAll')}</option>
      {sorted.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name} ({agent.playerIds.length})
        </option>
      ))}
      <option value={NO_AGENT}>{t('filter.agentNone')}</option>
    </select>
  );
}
