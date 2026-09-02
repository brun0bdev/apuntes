import type { ViewKind } from '../hooks/useUrlState';
import { ViewToggle } from './ViewToggle';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useI18n } from '../i18n';
import type { Theme } from '../hooks/useTheme';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  view: ViewKind;
  onViewChange: (view: ViewKind) => void;
}

/**
 * Cabecera: firma tricolor M de 4px arriba, título, tabs de vista (parrilla/
 * tabla/2027/tracking, con categoría de la guía), toggle de idioma y toggle de
 * tema. En móvil los tabs bajan a una segunda fila para no desbordar los 375px.
 */
export function Header({ theme, onToggleTheme, view, onViewChange }: HeaderProps) {
  const { t } = useI18n();

  return (
    <header className="border-b border-hairline">
      <div className="m-stripe" aria-hidden="true" />
      <div className="mx-auto w-full max-w-content px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="hidden text-caption text-muted sm:block">{t('header.subtitle')}</p>
            <h1 className="truncate text-title-md font-bold text-ink md:text-title-lg">Scouting LEC 2026</h1>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden md:block">
              <ViewToggle view={view} onChange={onViewChange} />
            </div>
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
        <div className="pb-2 md:hidden">
          <ViewToggle view={view} onChange={onViewChange} />
        </div>
      </div>
    </header>
  );
}
