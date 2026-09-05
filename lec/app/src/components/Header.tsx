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
  /** Clic en el título: vuelve a la vista inicio y limpia los filtros. */
  onGoHome: () => void;
}

/**
 * Cabecera: firma tricolor M de 4px arriba, título (enlace a la vista
 * inicio/parrilla), tabs de vista, toggle de idioma y toggle de tema. En móvil
 * los tabs bajan a una segunda fila para no desbordar los 375px.
 */
export function Header({ theme, onToggleTheme, view, onViewChange, onGoHome }: HeaderProps) {
  const { t } = useI18n();

  return (
    <header className="border-b border-hairline">
      <div className="m-stripe" aria-hidden="true" />
      <div className="mx-auto w-full max-w-content px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <a
            href="#/"
            onClick={(event) => {
              event.preventDefault();
              onGoHome();
              window.scrollTo({ top: 0 });
            }}
            className="group min-w-0 focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={t('header.goHomeAria')}
          >
            <h1 className="truncate text-title-md font-bold text-ink group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4 md:text-title-lg">
              Scouting LEC 2026
            </h1>
          </a>
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
