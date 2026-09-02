import { getAgent, getTeam } from '../data/players';
import { NO_AGENT } from '../lib/filters';
import { useI18n } from '../i18n';
import type { UrlState } from '../hooks/useUrlState';
import { AgentSelect } from './AgentSelect';
import { ExpiringToggle } from './ExpiringToggle';
import { RoleChips } from './RoleChips';
import { SearchInput } from './SearchInput';
import { TeamSelect } from './TeamSelect';

interface FilterBarProps {
  state: UrlState;
  update: (patch: Partial<UrlState>) => void;
  /** Coincidencias de la vista activa (para el contador). */
  matchCount: number;
  total: number;
}

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** Chip activo removible (✕) de la barra inferior. */
function RemovableChip({ chip, onRemoveAria }: { chip: ActiveChip; onRemoveAria: string }) {
  return (
    <button
      type="button"
      onClick={chip.onRemove}
      aria-label={onRemoveAria}
      className="flex h-8 items-center gap-2 border border-hairline bg-soft px-3 text-caption text-body hover:bg-elevated hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
    >
      {chip.label}
      <span aria-hidden="true" className="text-muted">
        ✕
      </span>
    </button>
  );
}

/**
 * Barra de filtros AND (PLAN.md §4): búsqueda con debounce, equipo, rol,
 * agente, solo-2026, chips activos removibles y contador de resultados.
 */
export function FilterBar({ state, update, matchCount, total }: FilterBarProps) {
  const { t, roleLabel } = useI18n();
  const query = state.q.trim();
  const chips: ActiveChip[] = [];

  if (query.length >= 2) {
    chips.push({ key: 'q', label: `«${query}»`, onRemove: () => update({ q: '' }) });
  }
  if (state.team !== '') {
    chips.push({
      key: 'team',
      label: getTeam(state.team)?.name ?? state.team,
      onRemove: () => update({ team: '' }),
    });
  }
  if (state.role !== '') {
    chips.push({
      key: 'role',
      label: roleLabel(state.role),
      onRemove: () => update({ role: '' }),
    });
  }
  if (state.agent !== '') {
    chips.push({
      key: 'agent',
      label:
        state.agent === NO_AGENT
          ? t('filter.agentNone')
          : (getAgent(state.agent)?.name ?? state.agent),
      onRemove: () => update({ agent: '' }),
    });
  }
  if (state.expiring2026) {
    chips.push({ key: 'expiring', label: t('filter.expiringChip'), onRemove: () => update({ expiring2026: false }) });
  }

  return (
    <section aria-label={t('view.groupAria')}>
      <div className="flex flex-col items-start gap-3 lg:flex-row">
        <SearchInput value={state.q} onChange={(q) => update({ q })} className="w-full lg:w-80 lg:shrink-0" />
        <TeamSelect
          value={state.team}
          onChange={(team) => update({ team })}
          className="w-full sm:w-auto lg:w-auto"
        />
        <AgentSelect value={state.agent} onChange={(agent) => update({ agent })} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RoleChips value={state.role} onChange={(role) => update({ role })} />
        <ExpiringToggle
          active={state.expiring2026}
          onToggle={() => update({ expiring2026: !state.expiring2026 })}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        {chips.map((chip) => (
          <RemovableChip key={chip.key} chip={chip} onRemoveAria={t('filter.removeOne', { label: chip.label })} />
        ))}
        {chips.length > 1 && (
          <button
            type="button"
            onClick={() => update({ q: '', team: '', role: '', agent: '', expiring2026: false })}
            className="h-8 px-2 text-caption font-bold uppercase text-accent hover:text-accent-active focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('filter.clearAll')}
          </button>
        )}
        <p className="ml-auto whitespace-nowrap text-body-sm text-muted" aria-live="polite">
          {t('filter.count', { shown: matchCount, total })}
        </p>
      </div>
    </section>
  );
}
