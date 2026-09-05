import { agents, players } from '../data/players';
import { NO_AGENT } from '../lib/filters';
import type { League } from '../types/player';
import { useI18n } from '../i18n';

interface AgentSelectProps {
  value: string;
  onChange: (agentId: string) => void;
  /** Liga activa: solo cuenta/lista agentes con clientes de esa liga. */
  league: League;
  className?: string;
}

/**
 * Filtro de agente/agencia a partir de data/agents.json (ordenado por nº de
 * clientes desc, PLAN.md §3). Con el índice vacío se muestra deshabilitado con
 * estado "Sin agentes definidos" + hint, nunca roto. La opción especial
 * NO_AGENT permite aislar a los jugadores sin representante. Scopeado a la
 * liga activa: el contador de clientes solo suma jugadores de esa liga.
 */
export function AgentSelect({ value, onChange, league, className = '' }: AgentSelectProps) {
  const { t } = useI18n();
  const playersById = new Map(players.map((p) => [p.id, p]));
  const clientIds = new Set(
    agents.flatMap((a) => a.playerIds).filter((id) => playersById.get(id)?.league === league),
  );
  const visible = agents.filter((a) => a.playerIds.some((id) => clientIds.has(id)));

  if (visible.length === 0) {
    return (
      <div className={className}>
        <select
          aria-label={t('filter.agentEmptyAria')}
          disabled
          value=""
          className="h-10 w-full cursor-not-allowed border border-hairline bg-soft px-2.5 text-body-sm text-muted sm:w-auto"
        >
          <option value="">{t('filter.agentEmpty')}</option>
        </select>
        <p className="mt-1 text-caption text-muted-soft">{t('filter.agentHint')}</p>
      </div>
    );
  }

  const sorted = [...visible].sort(
    (a, b) =>
      b.playerIds.filter((id) => clientIds.has(id)).length -
        a.playerIds.filter((id) => clientIds.has(id)).length ||
      a.name.localeCompare(b.name, 'es'),
  );

  return (
    <select
      aria-label={t('filter.agentAria')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 w-full border border-hairline bg-card px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-accent sm:w-auto ${className}`}
    >
      <option value="">{t('filter.agentAll')}</option>
      {sorted.map((agent) => {
        const count = agent.playerIds.filter((id) => clientIds.has(id)).length;
        return (
          <option key={agent.id} value={agent.id}>
            {agent.name} ({count})
          </option>
        );
      })}
      <option value={NO_AGENT}>{t('filter.agentNone')}</option>
    </select>
  );
}
