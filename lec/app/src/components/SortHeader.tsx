import type { SortDir, SortKey } from '../lib/sort';

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  sortKeyActive: SortKey;
  sortDirActive: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

/**
 * Cabecera clicable de la tabla: alterna asc/desc con flecha y expone
 * aria-sort para lectores de pantalla.
 */
export function SortHeader({ label, sortKey, sortKeyActive, sortDirActive, onSort, className = '' }: SortHeaderProps) {
  const active = sortKey === sortKeyActive;
  const ariaSort = active ? (sortDirActive === 'asc' ? 'ascending' : 'descending') : undefined;

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`h-12 border-b border-hairline px-3 text-left font-normal ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 whitespace-nowrap text-label-uppercase uppercase ${
          active ? 'text-ink' : 'text-muted hover:text-ink'
        }`}
      >
        {label}
        {active && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={sortDirActive === 'desc' ? 'rotate-180' : undefined}
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        )}
      </button>
    </th>
  );
}
