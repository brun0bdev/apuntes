import { useI18n } from '../i18n';

interface EmptyStateProps {
  onClear: () => void;
}

/** Estado vacío cuando ningún jugador pasa los filtros activos. */
export function EmptyState({ onClear }: EmptyStateProps) {
  const { t } = useI18n();

  return (
    <div data-export-root className="mt-6 border border-hairline bg-card px-6 py-16 text-center">
      <p className="text-title-md font-bold text-ink">{t('empty.title')}</p>
      <p className="mt-2 text-body-sm text-muted">{t('empty.body')}</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 h-12 bg-accent px-6 text-button font-bold uppercase text-on-primary hover:bg-accent-active focus-visible:outline-2 focus-visible:outline-accent"
      >
        {t('empty.clear')}
      </button>
    </div>
  );
}
