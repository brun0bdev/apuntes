import type { Player } from '../types/player';

/**
 * Formatea una fecha ISO yyyy-mm-dd del JSON en "16.11.2026" (formato del
 * diseño de referencia). Se parsea por partes (sin Date) para evitar desfases
 * de zona horaria. Devuelve null si no hay fecha; un formato inesperado se
 * muestra tal cual.
 */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

/** Año de una fecha ISO (para agrupaciones o "hasta 2027"). */
export function yearOf(iso: string | null): string | null {
  return iso ? iso.slice(0, 4) : null;
}

/**
 * La fecha es una estimación textual resuelta ("Post-Worlds …"): el pipeline
 * lo deja anotado en notes. Se marca con "≈" y un texto para lectores de pantalla.
 */
export function isEstimatedDate(player: Player): boolean {
  return /post-worlds/i.test(player.notes);
}

/**
 * Emoji de bandera a partir de un código ISO de dos letras ("DK" → 🇩🇰).
 * Devuelve null si el código no es válido (el dato se rellena a mano).
 *
 * @deprecated Chrome/Windows no renderiza los emoji de banderas regionales;
 * usar flagImg() que sirve un PNG local.
 */
export function flagEmoji(code: string | null): string | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  const letters = code.toUpperCase();
  return String.fromCodePoint(...[...letters].map((letter) => 127397 + letter.charCodeAt(0)));
}

/** Ruta del PNG de bandera bajo assets/flags (40×27, de flagcdn); null si el código no es válido. */
export function flagImg(code: string | null): string | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  return `assets/flags/${code.toLowerCase()}.png`;
}

/** Iniciales del avatar de fallback: primera letra de las dos primeras palabras. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
