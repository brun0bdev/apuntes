import type { ReactNode } from 'react';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

/**
 * Chip de filtro (guía light: reposo canvas+ink, activo bg-ink con texto
 * invertido — text-canvas resuelve el análogo correcto en ambos temas).
 * Geometría de la guía: padding 8/14, caption, esquinas rectas.
 */
export function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 whitespace-nowrap border px-3.5 text-caption transition-colors ${
        active
          ? 'border-ink bg-ink font-bold text-canvas'
          : 'border-hairline bg-canvas text-body hover:bg-soft hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
