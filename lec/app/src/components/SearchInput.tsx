import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

interface SearchInputProps {
  /** Valor comprometido (tras debounce) en el estado de la app. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Input de búsqueda h-10 (compacto, alineado con el resto de la barra) con
 * debounce de 200 ms. El filtrado real aplica el mínimo de 2 caracteres
 * (lib/filters.ts).
 */
export function SearchInput({ value, onChange, className = '' }: SearchInputProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);

  // Si el valor externo cambia (chips removibles, "Limpiar filtros"), se sincroniza.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), 200);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="search"
        aria-label={t('filter.searchAria')}
        placeholder={t('filter.searchPlaceholder')}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="h-10 w-full border border-hairline bg-card px-3 pr-9 text-body-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
      />
      {draft !== '' && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label={t('common.close')}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
