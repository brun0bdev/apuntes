#!/usr/bin/env node
/**
 * fetch-nationalities.mjs — Rellena la nacionalidad de las personas de
 * players.json que la tienen a null (hoy, los LCS: la LEC se rellenó a mano
 * en overrides.json y manda) leyendo la página RENDERIZADA de Leaguepedia
 * (rest.php/v1/page/<título>/html): el infoboxPlayer trae la fila
 * "Nationality" con una o varias banderas cuyo <img alt> es el nombre del
 * país (p. ej. alt="United States") o el title del enlace.
 *
 * El país se mapea a código ISO-2 (los flags de la app, lib/format.flagImg,
 * son <code>.svg del repo del usuario) con una tabla de la wiki entera
 * (los alt usan nombres largos: "South Korea" → KR). País desconocido →
 * warning y se deja null (nunca se inventa).
 *
 * Salida: data/nationalities.json ({ updatedAt, players: { <id>: "KR" } }).
 * Es un fichero DE DATOS intermedio: build-data.mjs lo fusiona y overrides
 * sigue mandando si tiene nacionalidad manual. Reanudable (merge) y con
 * pausas de 2-3 s; si tras ≥10 descargas hay >40% de fallos, aborta.
 *
 * Uso: node scripts/fetch-nationalities.mjs [--force] [--only id1,id2,...]
 */
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAYERS_PATH = path.join(ROOT, "data", "players.json");
const OUTPUT_PATH = path.join(ROOT, "data", "nationalities.json");

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const ONLY_IDX = argv.indexOf("--only");
const ONLY = ONLY_IDX !== -1 ? argv[ONLY_IDX + 1].split(",").map((s) => s.trim()) : null;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pause = () => sleep(2000 + Math.floor(Math.random() * 1000)); // 2-3 s

/** Nombre de país en la wiki → código ISO-2 de los flags de la app.
 * Fuente de nombres: alt/title de las banderas de Leaguepedia. */
const COUNTRY_TO_CODE = {
  "united states": "US",
  "canada": "CA",
  "mexico": "MX",
  "brazil": "BR",
  "argentina": "AR",
  "chile": "CL",
  "colombia": "CO",
  "peru": "PE",
  "uruguay": "UY",
  "venezuela": "VE",
  "puerto rico": "PR",
  "costa rica": "CR",
  "guatemala": "GT",
  "honduras": "HN",
  "el salvador": "SV",
  "panama": "PA",
  "cuba": "CU",
  "dominican republic": "DO",
  "jamaica": "JM",
  "south korea": "KR",
  "korea": "KR",
  "china": "CN",
  "taiwan": "TW",
  "hong kong": "HK",
  "japan": "JP",
  "vietnam": "VN",
  "philippines": "PH",
  "thailand": "TH",
  "malaysia": "MY",
  "singapore": "SG",
  "indonesia": "ID",
  "india": "IN",
  "australia": "AU",
  "new zealand": "NZ",
  "spain": "ES",
  "portugal": "PT",
  "france": "FR",
  "germany": "DE",
  "poland": "PL",
  "czech republic": "CZ",
  "czechia": "CZ",
  "slovakia": "SK",
  "austria": "AT",
  "switzerland": "CH",
  "italy": "IT",
  "greece": "GR",
  "netherlands": "NL",
  "belgium": "BE",
  "denmark": "DK",
  "sweden": "SE",
  "norway": "NO",
  "finland": "FI",
  "estonia": "EE",
  "latvia": "LV",
  "lithuania": "LT",
  "ukraine": "UA",
  "russia": "RU",
  "turkey": "TR",
  "israel": "IL",
  "united kingdom": "GB",
  "england": "GB",
  "wales": "GB",
  "scotland": "GB",
  "ireland": "IE",
  "croatia": "HR",
  "serbia": "RS",
  "slovenia": "SI",
  "romania": "RO",
  "bulgaria": "BG",
  "hungary": "HU",
  "bosnia and herzegovina": "BA",
  "north macedonia": "MK",
  "macedonia": "MK",
  "albania": "AL",
  "moldova": "MD",
  "georgia": "GE",
  "armenia": "AM",
  "azerbaijan": "AZ",
  "kazakhstan": "KZ",
  "algeria": "DZ",
  "morocco": "MA",
  "tunisia": "TN",
  "egypt": "EG",
  "south africa": "ZA",
  "nigeria": "NG",
  "kenya": "KE",
  "lebanon": "LB",
  "iraq": "IQ",
};

// ---------------------------------------------------------------------------

async function fetchWithUa(url) {
  const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA, Accept: "*/*" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} en ${url}`);
  return await res.text();
}

function wikiTitleFromSourceUrl(sourceUrl) {
  if (!sourceUrl) throw new Error("sin sourceUrl en players.json");
  const raw = sourceUrl.replace("https://lol.fandom.com/wiki/", "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

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

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/**
 * Nacionalidad del infoboxPlayer: fila "Country of Birth" (la wiki NO trae
 * una fila "Nationality"; el dato vive ahí). El país es el primer enlace
 * <a title="..."> de la celda — un nombre de país ("United States"), no la
 * bandera (el <img> va sin alt útil). Vuelven nombres de país o null.
 */
function extractNationalities(html) {
  const start = html.indexOf('id="infoboxPlayer"');
  if (start === -1) return null;
  const end = html.indexOf("</table>", start);
  const region = html.slice(start, end === -1 ? start + 60000 : end);
  // Localizar la fila "Country of Birth" (desde la etiqueta hasta el cierre de fila).
  const rowMatch = region.match(/Country of Birth[\s\S]{0,3000}?<\/tr>/i);
  if (!rowMatch) return null;
  const cell = rowMatch[0];
  // El país está en <span class="markup-object-name">United States</span>
  // (sprite de bandera con title equivalente como fallback).
  const countries = [...cell.matchAll(/markup-object-name">([^<]+)</g)]
    .map((m) => decodeEntities(m[1]).trim())
    .filter((t) => t.length > 0);
  if (countries.length === 0) {
    const titleMatch = cell.match(/title="([^"]+)"/);
    if (titleMatch) countries.push(decodeEntities(titleMatch[1]).trim());
  }
  return countries.length > 0 ? countries : null;
}

async function main() {
  if (!existsSync(PLAYERS_PATH)) {
    console.error("ERROR: no existe data/players.json — ejecuta antes build-data.mjs.");
    process.exit(1);
  }
  const players = JSON.parse(await readFile(PLAYERS_PATH, "utf8"));

  let prev = { players: {} };
  if (existsSync(OUTPUT_PATH)) {
    try {
      prev = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
    } catch {
      console.warn("AVISO: nationalities.json previo ilegible; se regenera.");
    }
  }
  const out = { ...(prev.players ?? {}) };

  const sinDato = [];
  const desconocidos = [];
  const fallos = [];
  let attempted = 0;
  let ok = 0;
  let failed = 0;
  let skipped = 0;
  let aborted = false;

  for (const p of players) {
    if (ONLY && !ONLY.includes(p.id)) continue;
    if (!FORCE && out[p.id]) {
      skipped++;
      continue;
    }
    if (attempted >= 10 && failed / (ok + failed) > 0.4) {
      console.error(`\nABORTADO: ${failed}/${ok + failed} páginas han fallado (>40%). Revisar; reanudable.`);
      aborted = true;
      break;
    }
    attempted++;
    try {
      const title = wikiTitleFromSourceUrl(p.sourceUrl);
      const html = await fetchPageHtml(title);
      const countries = extractNationalities(html);
      if (!countries) {
        sinDato.push(p.id);
        ok++;
        console.warn(`${p.id}: infobox sin fila "Country of Birth"`);
        continue;
      }
      const codes = [];
      for (const country of countries) {
        const code = COUNTRY_TO_CODE[country.toLowerCase()];
        if (!code) {
          desconocidos.push(`${p.id}: "${country}"`);
          continue;
        }
        codes.push(code);
      }
      if (codes.length === 0) {
        sinDato.push(p.id);
        continue;
      }
      // Un solo código: flagImg() espera ISO-2 de 2 letras; si el infobox trae
      // varios países, manda el primero (el principal).
      out[p.id] = codes[0];
      ok++;
      console.log(`${p.id}: ${out[p.id]} (${countries.join(", ")})`);
    } catch (err) {
      failed++;
      fallos.push(`${p.id}: ${err.message}`);
      console.warn(`${p.id}: FALLO — ${err.message}`);
    }
    await pause();
  }

  await writeFile(OUTPUT_PATH, JSON.stringify({ updatedAt: new Date().toISOString(), players: out }, null, 2) + "\n");
  console.log(`\nResumen: ${Object.keys(out).length} nacionalidades en ${path.basename(OUTPUT_PATH)} · ${ok} páginas OK esta ejecución · ${failed} fallos · ${skipped} ya estaban`);
  if (sinDato.length) console.log(`Sin dato en el infobox (${sinDato.length}): ${sinDato.join(", ")}`);
  if (desconocidos.length) console.log(`Países sin mapeo ISO (${desconocidos.length}):\n  ${desconocidos.join("\n  ")}`);
  if (fallos.length) console.log(`Descargas sin éxito: ${fallos.join(" | ")}`);
  if (aborted) process.exit(1);
}

main().catch((err) => {
  console.error("ERROR inesperado:", err?.stack ?? err);
  process.exit(1);
});
