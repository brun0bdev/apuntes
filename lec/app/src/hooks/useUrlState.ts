import { useCallback, useEffect, useState } from 'react';
import type { FilterValues } from '../lib/filters';
import { ROLE_ORDER } from '../lib/roles';
import { DEFAULT_SORT_KEY, SORT_KEYS, type SortDir, type SortKey } from '../lib/sort';
import type { Role } from '../types/player';

export type ViewKind = 'grid' | 'table' | 'roster2027' | 'staff2027' | 'tracking';

/** Estado completo de la app sincronizado con la URL (filtros + vista + orden). */
export interface UrlState extends FilterValues {
  view: ViewKind;
  sortKey: SortKey;
  sortDir: SortDir;
}

function parseRole(raw: string | null): Role | '' {
  return raw !== null && (ROLE_ORDER as ReadonlyArray<string>).includes(raw) ? (raw as Role) : '';
}

function parseSort(raw: string | null): { sortKey: SortKey; sortDir: SortDir } {
  if (!raw) return { sortKey: DEFAULT_SORT_KEY, sortDir: 'asc' };
  const separator = raw.lastIndexOf('-');
  if (separator === -1) return { sortKey: DEFAULT_SORT_KEY, sortDir: 'asc' };
  const key = raw.slice(0, separator);
  const dir = raw.slice(separator + 1);
  return {
    sortKey: (SORT_KEYS as ReadonlyArray<string>).includes(key) ? (key as SortKey) : DEFAULT_SORT_KEY,
    sortDir: dir === 'desc' ? 'desc' : 'asc',
  };
}

function parseView(raw: string | null): ViewKind {
  return raw === 'table' || raw === 'roster2027' || raw === 'staff2027' || raw === 'tracking' ? raw : 'grid';
}

/** Lee los filtros de la URL al montar; los valores inválidos caen al por defecto. */
function parseState(search: string): UrlState {
  const params = new URLSearchParams(search);
  return {
    q: params.get('q') ?? '',
    team: params.get('team') ?? '',
    role: parseRole(params.get('role')),
    agent: params.get('agent') ?? '',
    expiring2026: params.get('expiring') === '1',
    view: parseView(params.get('view')),
    ...parseSort(params.get('sort')),
  };
}

/**
 * Estado de filtros en la URL con history.replaceState (PLAN.md §2): enlaces
 * compartibles y filtros que sobreviven a un refresco. Los valores por defecto
 * no se escriben, así que la URL limpia se mantiene limpia.
 */
export function useUrlState(): readonly [UrlState, (patch: Partial<UrlState>) => void] {
  const [state, setState] = useState<UrlState>(() => parseState(window.location.search));

  useEffect(() => {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.team) params.set('team', state.team);
    if (state.role) params.set('role', state.role);
    if (state.agent) params.set('agent', state.agent);
    if (state.expiring2026) params.set('expiring', '1');
    if (state.view !== 'grid') params.set('view', state.view);
    if (state.sortKey !== DEFAULT_SORT_KEY || state.sortDir !== 'asc') {
      params.set('sort', `${state.sortKey}-${state.sortDir}`);
    }
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }, [state]);

  const update = useCallback((patch: Partial<UrlState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  return [state, update] as const;
}
