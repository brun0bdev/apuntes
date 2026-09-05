import type { Theme } from '../hooks/useTheme';
import { useI18n } from '../i18n';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/** Botón icono de 48px (guía: bg surface-card, rounded full) para alternar dark/light. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const { t } = useI18n();
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = nextTheme === 'dark' ? t('theme.toDark') : t('theme.toLight');

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-card text-ink hover:bg-elevated"
    >
      {theme === 'dark' ? (
        // Sol: se ofrece pasar a claro
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        // Luna: se ofrece pasar a oscuro
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
