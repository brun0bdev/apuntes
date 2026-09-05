import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { es, type Dict } from './es';
import type { Player, Role } from '../types/player';

export type Lang = 'es' | 'en';
export type DictKey = keyof Dict;

const DICTS: Record<Lang, Dict> = { es, en };
const STORAGE_KEY = 'lang';

function loadInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch {
    // localStorage bloqueado: se usa la detección del navegador.
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export type Params = Record<string, string | number>;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Traduce una clave e interpola {params}. */
  t: (key: DictKey, params?: Params) => string;
  /** Etiqueta del rol en el idioma activo (Top/Jungla vs Top/Jungle). */
  roleLabel: (role: Role) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const ROLE_KEYS: Record<Role, DictKey> = {
  top: 'role.top',
  jungle: 'role.jungle',
  mid: 'role.mid',
  adc: 'role.adc',
  support: 'role.support',
  coach: 'role.coach',
};

/** Etiqueta de un jugador para selects vinculados ("Caps · G2"). */
export function playerOptionLabel(player: Player): string {
  const team = player.teamId ? ` · ${player.teamId.toUpperCase()}` : '';
  return `${player.name}${team}`;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // sin almacenamiento: el idioma vive solo en memoria.
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[lang];
    const t = (key: DictKey, params?: Params): string => {
      let text: string = dict[key] ?? es[key];
      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          text = text.replaceAll(`{${name}}`, String(replacement));
        }
      }
      return text;
    };
    return {
      lang,
      setLang,
      t,
      roleLabel: (role: Role) => t(ROLE_KEYS[role]),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return ctx;
}
