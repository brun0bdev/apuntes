import type { ImportedPlayer, Role } from '../types/player';

/**
 * Búsqueda en vivo de jugadores en Leaguepedia (api.php con origin=*: CORS
 * anónimo soportado por MediaWiki). Es la ÚNICA llamada externa desde el
 * navegador y solo ocurre al buscar en la vista 2027; el resto de la app
 * sigue consumiendo JSON local (AGENTS.md).
 *
 * Flujo: prefixsearch sobre los títulos → para cada candidato, action=parse
 * del HTML renderizado y extracción de la tabla infoboxPlayer (equipo, rol,
 * foto). Los candidatos sin infoboxPlayer (equipos, torneos…) se descartan.
 */

const API = 'https://lol.fandom.com/api.php';
const WIKI_BASE = 'https://lol.fandom.com/wiki/';

export interface LeaguepediaCandidate extends ImportedPlayer {}

function slugify(title: string): string {
  return 'ext-' + title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function apiJson(params: Record<string, string>, signal?: AbortSignal): Promise<any> {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const res = await fetch(`${API}?${query.toString()}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} en Leaguepedia`);
  const data = await res.json();
  if (data?.error) throw new Error(`Leaguepedia: ${data.error.info ?? data.error.code}`);
  return data;
}

/** Detecta el rol a partir de los textos de celdas y los alt de imágenes del infobox. */
function detectRole(box: Element): Role {
  const candidates: string[] = [];
  box.querySelectorAll('img[alt]').forEach((img) => candidates.push(img.getAttribute('alt') ?? ''));
  box.querySelectorAll('td, th').forEach((cell) => candidates.push(cell.textContent ?? ''));
  const patterns: ReadonlyArray<[RegExp, Role]> = [
    [/\bhead coach\b|\bcoach\b|\bmanager\b/i, 'coach'],
    [/\btop\b/i, 'top'],
    [/\bjungle(r)?\b/i, 'jungle'],
    [/\bmid(dle)?( laner)?\b/i, 'mid'],
    [/\bbot(tom)?( laner)?\b|\badc\b/i, 'adc'],
    [/\bsupport( laner)?\b/i, 'support'],
  ];
  for (const candidate of candidates) {
    const text = candidate.trim();
    if (!text || text.length > 40) continue; // ignora párrafos largos
    for (const [pattern, role] of patterns) {
      if (pattern.test(text)) return role;
    }
  }
  return 'mid'; // heurística por defecto si el infobox no lo declara
}

function extractPhoto(box: Element): string | null {
  const img = box.querySelector('img');
  if (!img) return null;
  // El HTML parseado usa un placeholder data: en src y la URL real en data-src.
  let raw = img.getAttribute('src') ?? '';
  if (!raw || raw.startsWith('data:')) raw = img.getAttribute('data-src') ?? '';
  if (!raw || raw.startsWith('data:')) return null;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `https://lol.fandom.com${raw}`;
  return raw;
}

/** Texto de la fila del infobox cuyo label coincide (label en th o td.infobox-label). */
function rowValue(box: Element, labels: ReadonlyArray<string>): string | null {
  for (const tr of box.querySelectorAll('tr')) {
    const label =
      tr.querySelector('th')?.textContent?.trim().toLowerCase() ??
      tr.querySelector('td.infobox-label')?.textContent?.trim().toLowerCase() ?? '';
    if (labels.includes(label)) {
      const value = tr.querySelector('td:last-child')?.textContent?.trim();
      if (value) return value;
    }
  }
  return null;
}

function extractTeamName(box: Element): string | null {
  for (const tr of box.querySelectorAll('tr')) {
    const label =
      tr.querySelector('th')?.textContent?.trim().toLowerCase() ??
      tr.querySelector('td.infobox-label')?.textContent?.trim().toLowerCase() ?? '';
    if (label === 'team' || label === 'current team' || label === 'teams') {
      // Prefiere el texto del enlace con title (nombre del equipo) dentro de la celda.
      const anchor = tr.querySelector('td .teamname a[title]') ?? tr.querySelector('td a[title]');
      const name = anchor?.getAttribute('title') ?? anchor?.textContent?.trim() ?? null;
      if (name) return name;
    }
  }
  return null;
}

/**
 * Descarga y analiza la página de un título de Leaguepedia. Devuelve null si
 * la página no es de jugador (no tiene infoboxPlayer).
 */
export async function fetchPlayerPage(title: string, signal?: AbortSignal): Promise<LeaguepediaCandidate | null> {
  const data = await apiJson({ action: 'parse', page: title, prop: 'text' }, signal);
  // formatversion=2 devuelve el HTML como string directo; aceptamos también v1 ('*').
  const raw = data?.parse?.text;
  const html: string | undefined = typeof raw === 'string' ? raw : raw?.['*'];
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const box = doc.querySelector('table#infoboxPlayer');
  if (!box) return null;

  // "Contract Expires" (YYYY-MM-DD) cuando el infobox lo declara.
  const contractText = rowValue(box, ['contract expires', 'contract end']);
  const contractEnd = contractText?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
  const realName = rowValue(box, ['name']);

  return {
    id: slugify(title),
    name: title,
    realName: realName && realName !== title ? realName : null,
    role: detectRole(box),
    originTeamName: extractTeamName(box),
    contractEnd,
    photoUrl: extractPhoto(box),
    sourceUrl: `${WIKI_BASE}${encodeURIComponent(title.replace(/ /g, '_'))}`,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Busca jugadores por término: hasta `limit` resultados que sean páginas de
 * jugador. Se descartan las subpáginas con "/" (Faker/Match History…: no son
 * jugadores y sus parseos pesan varios MB). Consulta la búsqueda una vez y
 * resuelve los candidatos en serie con pausas cortas (educado con Fandom).
 */
export async function searchLeaguepediaPlayer(term: string, limit = 6, signal?: AbortSignal): Promise<LeaguepediaCandidate[]> {
  const query = term.trim();
  if (query.length < 2) return [];
  const data = await apiJson({ action: 'query', list: 'prefixsearch', pssearch: query, pslimit: '10' }, signal);
  const titles: string[] = (data?.query?.prefixsearch ?? [])
    .map((item: { title: string }) => item.title)
    .filter((title: string) => !title.includes('/'));

  const results: LeaguepediaCandidate[] = [];
  for (const title of titles) {
    if (results.length >= limit) break;
    await sleep(350);
    try {
      const player = await fetchPlayerPage(title, signal);
      if (player) results.push(player);
    } catch (err) {
      if (signal?.aborted) throw err;
      // candidato individual fallido: se salta sin abortar la búsqueda
    }
  }
  return results;
}
