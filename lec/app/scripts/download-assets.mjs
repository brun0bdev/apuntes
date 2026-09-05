#!/usr/bin/env node
/**
 * download-assets.mjs — Descarga a public/assets/ (reanudable: salta lo que ya
 * existe; --force para re-descargar):
 *   roles/   SVGs de posición del repo del usuario (github ibrunob/webBrunoB)
 *   teams/   logos WebP del mismo repo (lecVersus/img/logos)
 *   players/ fotos desde el HTML de la página de cada jugador (infoboxPlayer)
 *
 * Uso: node scripts/download-assets.mjs [--force] [--only roles|logos|players]
 * Escribe data/assets-manifest.json ({ source, url, fetchedAt } por asset).
 * Pausas de 2-3 s entre peticiones. Si >40% de fotos falla, aborta y reporta.
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_DIR = path.join(ROOT, "public", "assets");
const MANIFEST_PATH = path.join(ROOT, "data", "assets-manifest.json");
const PLAYERS_PATH = path.join(ROOT, "data", "players.json");

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const ONLY_IDX = argv.indexOf("--only");
const ONLY = ONLY_IDX !== -1 ? argv[ONLY_IDX + 1] : null;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pause = () => sleep(2000 + Math.floor(Math.random() * 1000)); // 2-3 s

// ---------------------------------------------------------------------------

const GITHUB_RAW = "https://raw.githubusercontent.com/ibrunob/webBrunoB/main";

/**
 * SVGs de posición del repo del usuario (lec/img/roles), renombrados a los ids
 * de rol de la app (jgl→jungle, bot→adc, sup→support). Incluye coach.svg.
 */
const ROLE_FILES = [
  { file: "top.svg", url: `${GITHUB_RAW}/lec/img/roles/top.svg` },
  { file: "jungle.svg", url: `${GITHUB_RAW}/lec/img/roles/jgl.svg` },
  { file: "mid.svg", url: `${GITHUB_RAW}/lec/img/roles/mid.svg` },
  { file: "adc.svg", url: `${GITHUB_RAW}/lec/img/roles/bot.svg` },
  { file: "support.svg", url: `${GITHUB_RAW}/lec/img/roles/sup.svg` },
  { file: "coach.svg", url: `${GITHUB_RAW}/lec/img/roles/coach.svg` },
];

/** Logos de equipo WebP del repo del usuario (lecVersus/img/logos), por id de teams.json. */
const TEAM_LOGOS = [
  { id: "fnc", file: "fnatic.webp" },
  { id: "g2", file: "g2.webp" },
  { id: "gx", file: "giantx.webp" },
  { id: "kc", file: "kc.webp" },
  { id: "koi", file: "mkoi.webp" },
  { id: "navi", file: "navi.webp" },
  { id: "sk", file: "sk.webp" },
  { id: "shf", file: "shifters.webp" },
  { id: "th", file: "th.webp" },
  { id: "vit", file: "vitality.webp" },
];

/**
 * Logos LCS: NO están en el repo del usuario → se bajan de Leaguepedia
 * ("<Equipo>logo std.png"). URLs estáticas de static.wikia verificadas (200)
 * a mano; con format=png el CDN sirve PNG y se guardan como .png (build-data
 * apunta a assets/teams/<id>.png para estos equipos). LYON usa fichero
 * desambiguado y en FlyQuest NO vale el de FlyQuest RED (equipo femenino).
 */
const TEAM_LOGOS_FANDOM = [
  {
    id: "c9",
    url: "https://static.wikia.nocookie.net/lolesports_gamepedia_en/images/0/09/Cloud9logo_std.png",
  },
  {
    id: "dig",
    url: "https://static.wikia.nocookie.net/lolesports_gamepedia_en/images/f/fb/Dignitaslogo_std.png",
  },
  {
    id: "dsg",
    url: "https://static.wikia.nocookie.net/lolesports_gamepedia_en/images/d/d1/Disguisedlogo_std.png",
  },
  {
    id: "fly",
    url: "https://static.wikia.nocookie.net/lolesports_gamepedia_en/images/7/7d/FlyQuestlogo_std.png",
  },
  {
    id: "lyon",
    url: "https://static.wikia.nocookie.net/lolesports_gamepedia_en/images/7/78/LYON_%282024_American_Team%29logo_std.png",
  },
  {
    id: "sen",
    url: "https://static.wikia.nocookie.net/lolesports_gamepedia_en/images/a/a5/Sentinelslogo_std.png",
  },
  {
    id: "sr",
    url: "https://static.wikia.nocookie.net/lolesports_gamepedia_en/images/1/17/Shopify_Rebellionlogo_std.png",
  },
  {
    id: "tl",
    url: "https://static.wikia.nocookie.net/lolesports_gamepedia_en/images/b/bf/Team_Liquidlogo_std.png",
  },
];

const manifest = { generatedAt: null, assets: {} };
let manifestDirty = false;

function manifestSet(key, entry) {
  const prev = manifest.assets[key];
  const next = { source: entry.source, url: entry.url ?? null, fetchedAt: new Date().toISOString(), ...entry };
  if (!prev || JSON.stringify(prev) !== JSON.stringify(next)) {
    manifest.assets[key] = next;
    manifestDirty = true;
  }
}

async function fetchWithUa(url, asBuffer = false) {
  const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA, Accept: "*/*" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} en ${url}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text();
}

function skipReason(destPath) {
  if (!FORCE && existsSync(destPath) && statSync(destPath).size > 0) return "existe";
  return null;
}

// ---------------------------------------------------------------------------
// ROLES
// ---------------------------------------------------------------------------
async function doRoles() {
  await mkdir(path.join(ASSETS_DIR, "roles"), { recursive: true });
  for (const { file, url } of ROLE_FILES) {
    const dest = path.join(ASSETS_DIR, "roles", file);
    if (skipReason(dest)) {
      console.log(`roles/${file}: ya existe, se salta (usa --force para re-descargar)`);
      continue;
    }
    try {
      const buf = await fetchWithUa(url, true);
      await writeFile(dest, buf);
      manifestSet(`roles/${file}`, { source: "github:webBrunoB (lec/img/roles)", url, bytes: buf.length });
      console.log(`roles/${file}: OK (${buf.length} bytes)`);
    } catch (err) {
      console.error(`roles/${file}: FALLO — ${err.message}`);
    }
    await pause();
  }
}

// ---------------------------------------------------------------------------
// LOGOS
// ---------------------------------------------------------------------------

/**
 * El CDN de Fandom (static.wikia.nocookie.net) devuelve WebP salvo que se pida
 * format=png explícitamente. Solo afecta a las fotos de jugador; los logos ya
 * son WebP del repo del usuario.
 */
function forcePng(url) {
  if (!url.includes("static.wikia.nocookie.net")) return url;
  return url + (url.includes("?") ? "&" : "?") + "format=png";
}

async function downloadTo(url, dest) {
  const buf = await fetchWithUa(forcePng(url), true);
  if (buf.length < 100) throw new Error(`contenido sospechosamente pequeño (${buf.length} bytes)`);
  await writeFile(dest, buf);
  return buf.length;
}

async function doLogos() {
  await mkdir(path.join(ASSETS_DIR, "teams", "lec"), { recursive: true });
  await mkdir(path.join(ASSETS_DIR, "teams", "lcs"), { recursive: true });
  const results = { ok: [], failed: [] };
  for (const { id, file } of TEAM_LOGOS) {
    const dest = path.join(ASSETS_DIR, "teams", "lec", `${id}.webp`);
    if (skipReason(dest)) {
      console.log(`teams/${id}.webp: ya existe, se salta`);
      results.ok.push(id);
      continue;
    }
    try {
      await pause();
      const bytes = await downloadTo(`${GITHUB_RAW}/lecVersus/img/logos/${file}`, dest);
      manifestSet(`teams/lec/${id}.webp`, { source: `github:webBrunoB (lecVersus/img/logos/${file})`, url: `${GITHUB_RAW}/lecVersus/img/logos/${file}`, bytes });
      console.log(`teams/${id}.webp: OK vía ${file} (${bytes} bytes)`);
      results.ok.push(id);
    } catch (err) {
      results.failed.push(id);
      console.error(`teams/${id}.webp: FALLO — ${err.message}`);
    }
  }

  // Logos LCS desde Fandom (PNG; format=png fuerza el formato en el CDN).
  // Van a teams/lcs/ para separarlos de los LEC (teams/lec/).
  for (const { id, url } of TEAM_LOGOS_FANDOM) {
    const dest = path.join(ASSETS_DIR, "teams", "lcs", `${id}.png`);
    if (skipReason(dest)) {
      console.log(`teams/lcs/${id}.png: ya existe, se salta`);
      results.ok.push(id);
      continue;
    }
    try {
      await pause();
      const bytes = await downloadTo(url, dest);
      manifestSet(`teams/lcs/${id}.png`, { source: "fandom:lolesports_gamepedia_en (logo std)", url, bytes });
      console.log(`teams/lcs/${id}.png: OK desde Fandom (${bytes} bytes)`);
      results.ok.push(id);
    } catch (err) {
      results.failed.push(id);
      console.error(`teams/lcs/${id}.png: FALLO — ${err.message}`);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// FOTOS DE JUGADORES
// ---------------------------------------------------------------------------

/** Extrae { imgSrc } del primer <img> dentro de <table id="infoboxPlayer">. */
function extractInfoboxImage(html) {
  const tableStart = html.indexOf('id="infoboxPlayer"');
  if (tableStart === -1) return null;
  const tableEnd = html.indexOf("</table>", tableStart);
  const region = html.slice(tableStart, tableEnd === -1 ? tableStart + 50000 : tableEnd);
  const imgIdx = region.indexOf("<img");
  if (imgIdx === -1) return null;
  const tagEnd = region.indexOf(">", imgIdx);
  if (tagEnd === -1) return null;
  const tag = region.slice(imgIdx, tagEnd + 1);
  const src = tag.match(/src="([^"]+)"/);
  return src ? { imgSrc: src[1].replace(/&amp;/g, "&") } : null;
}

async function doPlayerPhotos() {
  if (!existsSync(PLAYERS_PATH)) {
    console.error(`ERROR: no existe data/players.json — ejecuta antes build-data.mjs.`);
    return { attempted: 0, downloaded: 0, failed: 0, skipped: 0, aborted: false };
  }
  const players = JSON.parse(await readFile(PLAYERS_PATH, "utf8"));
  await mkdir(path.join(ASSETS_DIR, "players", "lec"), { recursive: true });
  await mkdir(path.join(ASSETS_DIR, "players", "lcs"), { recursive: true });

  let attempted = 0;
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;
  let aborted = false;
  const failDetail = [];

  for (const p of players) {
    const exts = ["png", "jpg", "jpeg", "webp", "gif"];
    const leagueDir = p.league === "lcs" ? "lcs" : "lec";
    const existing = exts.map((e) => path.join(ASSETS_DIR, "players", leagueDir, `${p.id}.${e}`)).find(existsSync);
    if (existing && !FORCE) {
      console.log(`players/${leagueDir}/${p.id}: ya existe (${path.basename(existing)}), se salta`);
      skipped++;
      continue;
    }
    if (manifest.assets[`players/${leagueDir}/${p.id}.png`]?.fallback && !FORCE) {
      console.log(`players/${leagueDir}/${p.id}: sin foto conocida (manifest), se salta`);
      skipped++;
      continue;
    }
    attempted++;
    if (attempted > 8 && failed / (downloaded + failed) > 0.4) {
      console.error(`\nABORTADO: ${failed}/${downloaded + failed} descargas de foto han fallado (>40%). Revisar antes de continuar; el script es reanudable.`);
      aborted = true;
      break;
    }
    try {
      // sourceUrl puede llevar el título percent-encodado (páginas con acentos);
      // decodificamos y volvemos a codificar para rest.php.
      const wikiEncoded = p.sourceUrl.replace("https://lol.fandom.com/wiki/", "");
      let wiki = wikiEncoded;
      try { wiki = decodeURIComponent(wikiEncoded); } catch { /* título ya plano */ }
      const html = await fetchWithUa(`https://lol.fandom.com/rest.php/v1/page/${encodeURIComponent(wiki)}/html`);
      const info = extractInfoboxImage(html);
      if (!info) throw new Error("sin infoboxPlayer o sin <img> en él");
      await pause();
      const ext = "png"; // forzamos format=png en el CDN: contenido y extensión coherentes
      const dest = path.join(ASSETS_DIR, "players", leagueDir, `${p.id}.${ext}`);
      const bytes = await downloadTo(info.imgSrc, dest);
      manifestSet(`players/${leagueDir}/${p.id}.${ext}`, { source: `fandom:${wiki} (infoboxPlayer)`, url: info.imgSrc, bytes });
      // limpiar restos de extensiones previas distintas
      for (const e of exts) {
        if (e !== ext) {
          const other = path.join(ASSETS_DIR, "players", leagueDir, `${p.id}.${e}`);
          if (existsSync(other)) (await import("node:fs/promises")).unlink(other).catch(() => {});
        }
      }
      downloaded++;
      console.log(`players/${leagueDir}/${p.id}.${ext}: OK (${bytes} bytes)`);
    } catch (err) {
      failed++;
      failDetail.push(`${p.id}: ${err.message}`);
      manifestSet(`players/${leagueDir}/${p.id}.png`, { source: "fandom", url: null, fallback: true, reason: err.message });
      console.warn(`players/${leagueDir}/${p.id}: FALLO — ${err.message}`);
    }
    await pause();
  }
  if (failDetail.length) {
    console.log(`\nFotos sin éxito (${failDetail.length}):`);
    for (const d of failDetail) console.log(`  - ${d}`);
  }
  return { attempted, downloaded, failed, skipped, aborted };
}

// ---------------------------------------------------------------------------

async function main() {
  if (existsSync(MANIFEST_PATH)) {
    try {
      const prev = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
      manifest.assets = prev.assets ?? {};
    } catch {
      console.warn("AVISO: assets-manifest.json previo ilegible; se regenera.");
    }
  }

  const doRolesFlag = !ONLY || ONLY === "roles";
  const doLogosFlag = !ONLY || ONLY === "logos";
  const doPlayersFlag = !ONLY || ONLY === "players";

  let roles = null;
  let logos = null;
  let photos = null;

  if (doRolesFlag) {
    console.log("== ROLES (repo webBrunoB) ==");
    await doRoles();
  }
  if (doLogosFlag) {
    console.log("\n== LOGOS DE EQUIPOS (repo webBrunoB) ==");
    logos = await doLogos();
    console.log(`Logos OK: ${logos.ok.length}/${logos.ok.length + logos.failed.length}${logos.failed.length ? ` — fallidos: ${logos.failed.join(", ")}` : ""}`);
  }
  if (doPlayersFlag) {
    console.log("\n== FOTOS DE JUGADORES (Fandom, best-effort) ==");
    photos = await doPlayerPhotos();
    console.log(`Fotos: ${photos.downloaded} descargadas esta ejecución · ${photos.failed} fallos · ${photos.skipped} ya existían${photos.aborted ? " · DESCARGA ABORTADA (>40% fallos)" : ""}`);
  }

  manifest.generatedAt = new Date().toISOString();
  if (manifestDirty || !existsSync(MANIFEST_PATH)) {
    await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`\nManifest escrito: ${path.relative(ROOT, MANIFEST_PATH)} (${Object.keys(manifest.assets).length} entradas)`);
  }
}

main().catch((err) => {
  console.error("ERROR inesperado:", err?.stack ?? err);
  process.exit(1);
});
