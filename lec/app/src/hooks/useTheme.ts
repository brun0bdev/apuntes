import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'theme';

/**
 * Tema inicial: el script anti-FOUC de index.html ya fijó data-theme en <html>
 * (localStorage → prefers-color-scheme), así que se lee del DOM. El fallback
 * cubre pruebas sin ese script.
 */
function readInitialTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  if (applied === 'dark' || applied === 'light') return applied;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Tema de la app: escribe data-theme en <html> y persiste en localStorage('theme').
 * El efecto también re-aplica el tema al montar, así el estado React y el DOM
 * quedan sincronizados aunque el script inline tomara otra decisión.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage bloqueado (p. ej. modo privado): el tema sigue funcionando en memoria.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
