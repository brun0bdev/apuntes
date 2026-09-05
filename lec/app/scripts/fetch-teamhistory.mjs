#!/usr/bin/env node
/**
 * fetch-teamhistory.mjs — Descarga el historial de equipos de cada persona de
 * players.json desde la página RENDERIZADA de Leaguepedia
 * (rest.php/v1/page/<título>/html), sección "Team History": la tabla del loader
 * del Contract Database con cabeceras "Team" / "Start" / "End". La wiki no
 * trae el rango precompuesto: se deriva de Start/End como "start–end" (en
 * dash) o año único si start == end; "Present" se copia verbatim.
 *
 * La tabla aparece DOS veces en la página (variante normal + variante
 * expandida con role-swaps): se parsea la PRIMERA instancia. Las filas se
 * guardan tal cual las ordena la wiki, de más ANTIGUO a más RECIENTE
 * (Razork: Dimegio Club 2016 → Fnatic Dec 2021–Present).
 *
 * Uso: node scripts/fetch-teamhistory.mjs [--force] [--only id1,id2,...]
 * Escribe data/teamhistory.json ({ updatedAt, players: { <id>: [{team, years}] } }).
 * Solo se guardan ids con array no vacío; las entradas previas no
 * re-descargadas se conservan (merge) → reanudable: los ids ya presentes se
 * saltan salvo con --force.
 * Pausas de 2-3 s entre peticiones (85 páginas ≈ 5-6 min). Si tras ≥10
 * descargas hay >40% de fallos, aborta y reporta.
 */
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAYERS_PATH = path.join(ROOT, "data", "players.json");
const OUTPUT_PATH = path.join(ROOT, "data", "teamhistory.json");

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const ONLY_IDX = argv.indexOf("--only");
const ONLY = ONLY_IDX !== -1 ? argv[ONLY_IDX + 1].split(",").map((s) => s.trim()) : null;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pause = () => sleep(2000 + Math.floor(Math.random() * 1000)); // 2-3 s

// ---------------------------------------------------------------------------

async function fetchWithUa(url) {
  const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA, Accept: "*/*" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} en ${url}`);
  return await res.text();
}

/** Título wiki = sourceUrl sin el prefijo /wiki/; los sourceUrl llevan el
 * título percent-encodado (páginas desambiguadas/acentos), se decodifica con
 * fallback plano. */
function wikiTitleFromSourceUrl(sourceUrl) {
  if (!sourceUrl) throw new Error("sin sourceUrl en players.json");
  const raw = sourceUrl.replace("https://lol.fandom.com/wiki/", "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** El body puede ser JSON (HTML dentro de .parse.html["*"]) o HTML directo. */
async function fetchPageHtml(wikiTitle) {
  const url = `https://lol.fandom.com/rest.php/v1/page/${encodeURIComponent(wikiTitle)}/html`;
  const body = await fetchWithUa(url);
  const trimmed = body.trimStart();
  if (trimmed.startsWith("{")) {
    const json = JSON.parse(trimmed);
    const html = json?.parse?.html?.["*"];
    if (!html) throw new Error(`respuesta JSON sin parse.html: ${json?.error?.info ?? "desconocido"}`);
    return html;
  }
  return body;
}

// ---------------------------------------------------------------------------
// Parsing HTML (sin dependencias: escáner con conciencia de comillas, porque
// los atributos data-mw/data-parsoid de Parsoid pueden contener '>' dentro de
// valores entrecomillados).
// ---------------------------------------------------------------------------

/** Índice del '>' que cierra el tag abierto en `from`: primer '>' fuera de
 * comillas. */
function tagEnd(html, from) {
  let quote = null;
  for (let i = from; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  return -1;
}

/** Extrae la tabla completa que empieza en `start`, cerrando por conteo de
 * <table>/</table> para soportar el anidado. */
function extractTable(html, start) {
  let depth = 1;
  let i = start + 6; // tras "<table"
  while (i < html.length) {
    const nextOpen = html.indexOf("<table", i);
    const nextClose = html.indexOf("</table>", i);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 6;
    } else {
      depth--;
      i = nextClose + 8;
      if (depth === 0) return html.slice(start, i);
    }
  }
  return null;
}

/** Decodifica entidades HTML (numéricas y las nombradas habituales), hasta 3
 * pasadas por si hay doble codificación. &amp; se resuelve al final de cada
 * pasada para no "destapar" otras entidades de más. */
function decodeEntities(s) {
  let prev = null;
  let out = s;
  for (let n = 0; n < 3 && out !== prev; n++) {
    prev = out;
    out = out
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&nbsp;/g, " ")
      .replace(/&ndash;/g, "–")
      .replace(/&mdash;/g, "—")
      .replace(/&hellip;/g, "…")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }
  return out;
}

const INVISIBLES = /[\u200B-\u200F\u2060-\u2064\uFEFF\u00AD]/g; // word-joiners, ZWSP, BOM, soft hyphen

/** Texto visible de un fragmento HTML: quita tags, decodifica entidades,
 * limpia invisibles y colapsa espacios. */
function visibleText(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(INVISIBLES, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Contenidos de las celdas <tag>...</tag> de una fila: desde el fin del tag
 * abierto (primer '>' fuera de comillas) hasta su cierre (las tablas del
 * historial no anidan tablas dentro de celdas). */
function extractCells(rowHtml, tag) {
  const cells = [];
  let i = 0;
  while (true) {
    const open = rowHtml.indexOf("<" + tag, i);
    if (open === -1) break;
    const end = tagEnd(rowHtml, open);
    if (end === -1) break;
    const close = rowHtml.indexOf("</" + tag + ">", end);
    if (close === -1) break;
    cells.push(rowHtml.slice(end + 1, close));
    i = close + tag.length + 3;
  }
  return cells;
}

/** Textos visibles de los <a> de una celda (el nombre del equipo; el logo es
 * un <img> y su alt no se usa porque solo se lee el texto interior). Descarta
 * las anclas de referencias (#cite_note). */
function linkTexts(cellHtml) {
  const out = [];
  const re = /<a[\s>]/g;
  let m;
  while ((m = re.exec(cellHtml))) {
    const end = tagEnd(cellHtml, m.index);
    if (end === -1) break;
    const openTag = cellHtml.slice(m.index, end + 1);
    const close = cellHtml.indexOf("</a>", end);
    if (close === -1) break;
    re.lastIndex = close + 4;
    const href = openTag.match(/href="([^"]*)"/)?.[1] ?? "";
    if (/cite_note/i.test(href)) continue;
    const text = visibleText(cellHtml.slice(end + 1, close));
    if (text) out.push(text);
  }
  return out;
}

/** Año de una celda Start/End: primer 19xx/20xx del texto visible; "Present"
 * verbatim si no hay año pero se menciona. Las referencias ya se han quitado
 * (se eliminaron los <sup> de la tabla), así que el primer año del texto es
 * el de la fecha visible ("Aug 2016 2016-08-02"). */
function extractYear(cellHtml) {
  const text = visibleText(cellHtml);
  const y = text.match(/(?:19|20)\d{2}/);
  if (y) return y[0];
  if (/present/i.test(text)) return "Present";
  return null;
}

/** Rango "start–end" (en dash), año único si coinciden; "Present" verbatim. */
function composeYears(startHtml, endHtml) {
  const s = extractYear(startHtml);
  const e = extractYear(endHtml);
  if (s && e) return s === e ? s : `${s}–${e}`;
  return s ?? e ?? null;
}

/** Recorre las tablas del documento en orden y devuelve la PRIMERA cuyo bloque
 * de cabecera (antes de la primera <td>) contiene Team+Start+End. */
function findHistoryTable(html) {
  const openRe = /<table[\s>]/g;
  let m;
  while ((m = openRe.exec(html))) {
    const table = extractTable(html, m.index);
    if (!table) return null;
    // Las refs viven en <sup> con atributos data-mw enormes: se quitan enteras
    // (contenido incluido) para no contaminar el texto de las celdas de fechas.
    const clean = table.replace(/<sup\b[\s\S]*?<\/sup>/g, "");
    const headEnd = clean.search(/<td[\s>]/);
    const headText = visibleText(headEnd === -1 ? clean : clean.slice(0, headEnd)).toLowerCase();
    if (headText.includes("team") && headText.includes("start") && headText.includes("end")) {
      const cols = headerCols(clean);
      if (cols) return { table: clean, cols };
    }
    openRe.lastIndex = m.index + 6; // no coincide: seguir dentro por si hay tablas anidadas
  }
  return null;
}

/** Mapa de columnas a partir de la primera fila con <th>: índices de "Team",
 * "Start" y "End". */
function headerCols(table) {
  const trRe = /<tr[\s>]/g;
  let m;
  while ((m = trRe.exec(table))) {
    const end = tagEnd(table, m.index);
    if (end === -1) break;
    const close = table.indexOf("</tr>", end);
    if (close === -1) break;
    const row = table.slice(end + 1, close);
    trRe.lastIndex = close + 5;
    if (!/<th[\s>]/.test(row)) continue;
    const texts = extractCells(row, "th").map(visibleText);
    const find = (name) => texts.findIndex((t) => t.toLowerCase() === name);
    const team = find("team");
    const start = find("start");
    const endCol = find("end");
    if (team === -1 || start === -1 || endCol === -1) return null;
    return { team, start, endCol };
  }
  return null;
}

/** Filas de la tabla → [{team, years}]. */
function parseTeamHistory(html) {
  const found = findHistoryTable(html);
  if (!found) return [];
  const { table, cols } = found;
  const rows = [];
  const trRe = /<tr[\s>]/g;
  let m;
  while ((m = trRe.exec(table))) {
    const end = tagEnd(table, m.index);
    if (end === -1) break;
    const close = table.indexOf("</tr>", end);
    if (close === -1) break;
    const row = table.slice(end + 1, close);
    trRe.lastIndex = close + 5;
    if (!/<td[\s>]/.test(row)) continue; // fila de cabecera
    const cells = extractCells(row, "td");
    const teamHtml = cells[cols.team];
    const startHtml = cells[cols.start];
    const endHtml = cells[cols.endCol];
    if (teamHtml === undefined || startHtml === undefined || endHtml === undefined) continue;
    const team = linkTexts(teamHtml)[0] ?? visibleText(teamHtml); // fallback: equipo sin enlace (red link)
    const years = composeYears(startHtml, endHtml);
    if (!team) continue; // fila separadora/vacía
    rows.push({ team, years });
  }
  return rows;
}

// ---------------------------------------------------------------------------

async function main() {
  if (!existsSync(PLAYERS_PATH)) {
    console.error("ERROR: no existe data/players.json — ejecuta antes build-data.mjs.");
    process.exit(1);
  }
  const players = JSON.parse(await readFile(PLAYERS_PATH, "utf8"));
  console.log(`players.json: ${players.length} registros${ONLY ? ` (--only: ${ONLY.join(", ")})` : ""}`);

  // Merge con el fichero previo: las entradas no re-descargadas se conservan.
  let prevPlayers = {};
  if (existsSync(OUTPUT_PATH)) {
    try {
      prevPlayers = JSON.parse(await readFile(OUTPUT_PATH, "utf8")).players ?? {};
    } catch {
      console.warn("AVISO: teamhistory.json previo ilegible; se regenera.");
    }
  }

  const out = { ...prevPlayers };
  const sinTabla = [];
  const fallos = [];
  let attempted = 0;
  let ok = 0;
  let failed = 0;
  let skipped = 0;
  let aborted = false;

  for (const p of players) {
    if (ONLY && !ONLY.includes(p.id)) continue;
    if (!FORCE && Array.isArray(out[p.id]) && out[p.id].length > 0) {
      skipped++;
      continue;
    }
    // Guarda anti-thrash: si tras ≥10 descargas hay >40% de fallos, abortar.
    if (attempted >= 10 && failed / (ok + failed) > 0.4) {
      console.error(
        `\nABORTADO: ${failed}/${ok + failed} páginas han fallado (>40%). Revisar antes de continuar; el script es reanudable.`
      );
      aborted = true;
      break;
    }
    attempted++;
    try {
      const title = wikiTitleFromSourceUrl(p.sourceUrl);
      const html = await fetchPageHtml(title);
      const rows = parseTeamHistory(html);
      if (rows.length > 0) {
        out[p.id] = rows;
        ok++;
        console.log(`${p.id}: OK (${rows.length} etapas) — ${rows[0].team} → ${rows[rows.length - 1].team}`);
      } else {
        sinTabla.push(p.id);
        ok++;
        console.warn(`${p.id}: página descargada pero SIN tabla Team/Start/End`);
      }
    } catch (err) {
      failed++;
      fallos.push(`${p.id}: ${err.message}`);
      console.warn(`${p.id}: FALLO — ${err.message}`);
    }
    await pause();
  }

  // Se escribe siempre lo acumulado (también al abortar) para poder reanudar.
  const payload = { updatedAt: new Date().toISOString(), players: out };
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n");

  const conHistorial = Object.values(out).filter((a) => Array.isArray(a) && a.length > 0).length;
  console.log(`\nResumen: ${conHistorial}/${players.length} con historial · ${skipped} ya estaban (skip) · ${ok} descargas OK esta ejecución · ${failed} fallos`);
  if (sinTabla.length) {
    console.log(`Sin tabla Team/Start/End (${sinTabla.length}): ${sinTabla.join(", ")}`);
  }
  if (fallos.length) {
    console.log(`Descargas sin éxito (${fallos.length}):`);
    for (const d of fallos) console.log(`  - ${d}`);
  }
  console.log(`Escrito: ${path.relative(ROOT, OUTPUT_PATH)}`);
  if (aborted) process.exit(1);
}

main().catch((err) => {
  console.error("ERROR inesperado:", err?.stack ?? err);
  process.exit(1);
});
