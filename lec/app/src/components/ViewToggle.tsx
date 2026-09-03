import type { ViewKind } from '../hooks/useUrlState';
import { useI18n } from '../i18n';

interface ViewToggleProps {
  view: ViewKind;
  onChange: (view: ViewKind) => void;
}

/** Tabs de categoría (guía): Parrilla / Tabla / 2027 / Tracking, con subrayado en la activa. */
export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const { t } = useI18n();
  const tabs: ReadonlyArray<{ value: ViewKind; label: string }> = [
    { value: 'grid', label: t('view.grid') },
    { value: 'table', label: t('view.table') },
    { value: 'roster2027', label: t('view.2027') },
    { value: 'staff2027', label: t('view.staff2027') },
    { value: 'tracking', label: t('view.tracking') },
  ];

  return (
    <div role="group" aria-label={t('view.groupAria')} className="flex items-center gap-6">
      {tabs.map((tab) => {
        const active = view === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={`border-b-2 py-3 text-label-uppercase uppercase transition-colors ${
              active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
