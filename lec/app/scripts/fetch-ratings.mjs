#!/usr/bin/env node
/**
 * fetch-ratings.mjs — Descarga la nota media de la temporada 2026 de cada
 * jugador LEC desde esportstransfer.com (ficha `/lol/player/<id>`; el slug es
 * el id de players.json) y escribe data/ratings.json.
 *
 * Uso: node scripts/fetch-ratings.mjs [--force]
 * Reanudable: salta los ids con fetchedAt de menos de 24 h salvo --force.
 * Pausas de 2-3 s entre peticiones. 404 o página sin nota → rating null con
 * campo reason (no aborta; try/catch por jugador).
 *
 * Parseo en cascada sobre el HTML crudo:
 *   a) JSON-LD: "name": "2026 season rating", "value": 6.02 y
 *      "name": "Games in 2026", "value": 24 (en inglés, fiable en todas las
 *      locales; es la fuente preferida);
 *   b) texto visible junto a la nota (p class="plead"/"upd"), multilocal porque
 *      el sitio geo-sirve la locale según el cliente (node fetch recibe ko, curl
 *      es): ES "(24 partidas · 54% de victorias)", EN "(24 games · 54% win rate)",
 *      KO "(24경기 · 승률 54%)". El % de victorias SOLO está en este texto;
 *   c) fallback genérico "2026 ... 6.02" con guard de rango 0-10.
 *
 * Segunda pasada (adj): nota AJUSTADA por muestra y contexto de equipo.
 *   mu     = media de rating entre jugadores con games >= 10 (media de la liga,
 *            calculada sobre el propio dataset al final de la pasada de descarga)
 *   shrunk = (rating * games + mu * PRIOR_GAMES) / (games + PRIOR_GAMES)
 *            shrinkage bayesiano hacia la media: las muestras pequeñas (pocas
 *            partidas) se acercan a mu y dejan de dominar el top;
 *            PRIOR_GAMES = 6 (peso de la media en el shrinkage).
 *   wrAdj  = (winRate - 0.5) * WINRATE_WEIGHT, WINRATE_WEIGHT = 1.5
 *            (contexto de equipo: la WR proxy del nivel del equipo ajusta la
 *            nota individual en ±0.75 como máximo = (WR - 50%) * 1.5).
 *   adj    = clamp(shrunk + wrAdj, 0, 10) redondeado a 2 decimales (intermedio,
 *            se conserva como campo `adj` en el JSON para auditoría).
 * Si falta games/winRate → adj = rating (sin ajuste). Sin rating → todo null.
 *
 * Tercera pasada (estandarización z): la nota cruda de esportstransfer ocupa
 * solo ~5.2-6.5 de la escala 0-10, así que `adj` se re-escala a la escala
 * completa para que la nota final diferencie de verdad:
 *   muAdj = media de los `adj` (todos los jugadores con rating no null)
 *   sdAdj = desviación típica POBLACIONAL de esos mismos `adj`
 *   score = clamp(round2(5 + Z_SPREAD * ((adj - muAdj) / sdAdj)), 0, 10)
 *           con Z_SPREAD = 1.6 → por construcción 5.00 = media de la liga y
 *           ±1.6σ llega a ~0/10. Si sdAdj < 0.05 o hay menos de 2 jugadores
 *           con adj → score = 5 para todos (evita la división por cero).
 */
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAYERS_PATH = path.join(ROOT, "data", "players.json");
const OUTPUT_PATH = path.join(ROOT, "data", "ratings.json");

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BASE_URL = "https://esportstransfer.com/es/lol/player/";

/** Caducidad de la cache: las notas casi no cambian en un día. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pause = () => sleep(2000 + Math.floor(Math.random() * 1000)); // 2-3 s

// ---------------------------------------------------------------------------

/**
 * Extrae nota, partidas y % de victorias del HTML. Devuelve
 * { rating, games, winRate } (games/winRate pueden ser null) o { reason }
 * si no hay nota. Cascada de estrategias, la primera que acierte gana.
 *   - games: JSON-LD "Games in 2026" (ancla estable), fallback al texto
 *     "(N partidas · M% de victorias)".
 *   - winRate: SOLO está en el texto visible, nunca en el JSON-LD.
 */
function extractPlayerStats(html) {
  // a) JSON-LD con esquema.org: el name está en inglés en todas las locales.
  let rating = null;
  const ld = html.match(/"name":\s*"2026 season rating",\s*"value":\s*(\d{1,2}(?:\.\d{1,2})?)/);
  if (ld) {
    const parsed = Number.parseFloat(ld[1]);
    if (parsed >= 0 && parsed <= 10) rating = parsed;
  }

  let games = null;
  const ldGames = html.match(/"name":\s*"Games in 2026",\s*"value":\s*(\d{1,4})\b/);
  if (ldGames) games = Number.parseInt(ldGames[1], 10);

  // b) Texto visible junto a la nota, multilocal (el sitio geo-sirve la locale;
  //    pedimos /es/ pero aceptamos EN y KO por robustez):
  //    ES "(24 partidas · 54% de victorias)" · EN "(24 games · 54% win rate)"
  //    KO "(24경기 · 승률 54%)". El % de victorias solo aparece aquí.
  let winRate = null;
  const combined = html.match(
    /(\d{1,4})\s*(?:partidas|games|경기)\s*·\s*(?:승률\s*)?(\d{1,3})\s*%\s*(?:de\s+victorias|win rate)?/i,
  );
  if (combined) {
    if (games == null) games = Number.parseInt(combined[1], 10);
    const pct = Number.parseInt(combined[2], 10);
    if (pct >= 0 && pct <= 100) winRate = pct / 100;
  } else {
    // Fallback suelto: keyword antes (KO) o después (ES/EN) del número.
    const wr = html.match(/승률\s*(\d{1,3})\s*%/i) ?? html.match(/(\d{1,3})\s*%\s*(?:de\s+victorias|win rate)/i);
    if (wr) {
      const pct = Number.parseInt(wr[1], 10);
      if (pct >= 0 && pct <= 100) winRate = pct / 100;
    }
  }

  if (rating != null) return { rating, games, winRate };

  // b2) Texto visible en español: "nota de la temporada 2026" seguido de la cifra.
  const es = html.match(/nota de la temporada\s*2026\D{0,20}?(\d{1,2}\.\d{1,2})/i);
  if (es) {
    const parsed = Number.parseFloat(es[1]);
    if (parsed >= 0 && parsed <= 10) return { rating: parsed, games, winRate };
  }

  // c) Fallback genérico: primer decimal 0-10 cercano a una mención de 2026.
  const generic = html.match(/2026[^0-9]{0,40}?(\d\.\d{1,2})/s);
  if (generic) {
    const parsed = Number.parseFloat(generic[1]);
    if (parsed >= 0 && parsed <= 10) return { rating: parsed, games, winRate };
  }

  return { reason: "HTML sin nota 2026 reconocible" };
}

// ---------------------------------------------------------------------------

/** Constantes del score ajustado (ver cabecera para el razonamiento). */
const PRIOR_GAMES = 6; // shrinkage bayesiano: peso de mu frente a las partidas reales
const WINRATE_WEIGHT = 1.5; // contexto de equipo: (winRate - 0.5) * 1.5 → ±0.75 máx.
const Z_SPREAD = 1.6; // estandarización z: ±1.6σ ≈ 0/10 en la escala final

/**
 * Segunda + tercera pasada: recalcula adj y score para TODAS las entradas del
 * dataset (también las reanudadas de la cache). La estandarización es de toda
 * la liga, así que se hace una sola vez al terminar la descarga.
 *
 *   1) adj = nota ajustada (shrinkage + WR), con mu = media de rating entre
 *      jugadores con games >= 10. Sin games/winRate → adj = rating.
 *   2) score = estandarización z de adj sobre toda la liga (ver cabecera).
 */
function applyScores(output) {
  const entries = Object.values(output.players);
  const withSample = entries.filter((e) => e.rating != null && e.games != null && e.games >= 10);
  const mu =
    withSample.length > 0
      ? withSample.reduce((sum, e) => sum + e.rating, 0) / withSample.length
      : null;

  // Pasada 1: nota ajustada → campo intermedio `adj`.
  for (const e of entries) {
    if (e.rating == null) {
      e.games = null;
      e.winRate = null;
      e.adj = null;
      e.score = null;
      continue;
    }
    if (e.games != null && e.winRate != null && mu != null) {
      const shrunk = (e.rating * e.games + mu * PRIOR_GAMES) / (e.games + PRIOR_GAMES);
      const wrAdj = (e.winRate - 0.5) * WINRATE_WEIGHT;
      e.adj = Math.round(Math.min(10, Math.max(0, shrunk + wrAdj)) * 100) / 100;
    } else {
      e.adj = e.rating; // sin muestra/WR: sin ajuste
    }
  }

  // Pasada 2: estandarización z sobre la escala completa (5.00 = media de liga).
  const withAdj = entries.filter((e) => e.adj != null);
  const n = withAdj.length;
  const muAdj = n > 0 ? withAdj.reduce((sum, e) => sum + e.adj, 0) / n : null;
  const sdAdj =
    n > 0 ? Math.sqrt(withAdj.reduce((sum, e) => sum + (e.adj - muAdj) ** 2, 0) / n) : null;
  const degenerate = muAdj == null || sdAdj == null || sdAdj < 0.05 || n < 2;

  for (const e of entries) {
    if (e.adj == null) continue;
    e.score = degenerate
      ? 5
      : Math.round(Math.min(10, Math.max(0, 5 + Z_SPREAD * ((e.adj - muAdj) / sdAdj))) * 100) / 100;
  }

  return { mu, sampleSize: withSample.length, muAdj, sdAdj, degenerate };
}

// ---------------------------------------------------------------------------

async function main() {
  if (!existsSync(PLAYERS_PATH)) {
    console.error("ERROR: no existe data/players.json — ejecuta antes build-data.mjs.");
    process.exit(1);
  }
  const players = JSON.parse(await readFile(PLAYERS_PATH, "utf8"));
  // Solo LEC: la estandarización z (score = 5 + 1.6·z) asume una única población
  // ("5.00 = media de la liga"); mezclar LCS contaminaría ambas distribuciones.
  const targets = players.filter((p) => p.isCoach === false && (p.league ?? "lec") === "lec");
  console.log(`Jugadores (sin coaches, solo LEC): ${targets.length}`);

  // Salida previa reanudable: respetamos fetchedAt < 24 h salvo --force.
  const output = { updatedAt: null, players: {} };
  if (existsSync(OUTPUT_PATH)) {
    try {
      const prev = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
      output.players = prev.players ?? {};
    } catch {
      console.warn("AVISO: ratings.json previo ilegible; se regenera.");
    }
  }

  let ok = 0;
  let nulls = 0;
  let skipped = 0;
  const failDetail = [];

  for (const p of targets) {
    const prevEntry = output.players[p.id];
    if (!FORCE && prevEntry?.fetchedAt && Date.now() - Date.parse(prevEntry.fetchedAt) < MAX_AGE_MS) {
      if (prevEntry.rating != null) ok++;
      else nulls++;
      skipped++;
      continue;
    }

    try {
      const res = await fetch(`${BASE_URL}${p.id}`, {
        headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*" },
        redirect: "follow",
      });
      if (res.status === 404) {
        output.players[p.id] = { rating: null, fetchedAt: new Date().toISOString(), slug: p.id, reason: "404 en esportstransfer.com" };
        nulls++;
        failDetail.push(`${p.id}: 404`);
        console.warn(`ratings/${p.id}: sin dato — 404`);
        await pause();
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      // Guard de notas cruzadas: la URL final debe seguir siendo la ficha pedida
      // (un redirect a portada/listado no corresponde a este jugador).
      const finalUrl = res.url ?? "";
      if (!finalUrl.endsWith(`/lol/player/${p.id}`)) {
        throw new Error(`redirect inesperado: ${finalUrl || "(sin url final)"}`);
      }

      const html = await res.text();
      const result = extractPlayerStats(html);
      if (result.rating != null) {
        output.players[p.id] = {
          rating: result.rating,
          games: result.games,
          winRate: result.winRate,
          score: null, // se calcula en applyScores() tras la pasada completa
          adj: null, // nota ajustada intermedia, ídem
          fetchedAt: new Date().toISOString(),
          slug: p.id,
        };
        ok++;
        console.log(
          `ratings/${p.id}: ${result.rating.toFixed(2)} · ${result.games ?? "?"} part. · ${
            result.winRate != null ? `${Math.round(result.winRate * 100)}% V` : "sin WR"
          }`,
        );
      } else {
        output.players[p.id] = { rating: null, fetchedAt: new Date().toISOString(), slug: p.id, reason: result.reason };
        nulls++;
        failDetail.push(`${p.id}: ${result.reason}`);
        console.warn(`ratings/${p.id}: sin dato — ${result.reason}`);
      }
    } catch (err) {
      // Fallo de red/parseo: se registra con reason y se sigue (reanudable).
      output.players[p.id] = { rating: null, fetchedAt: new Date().toISOString(), slug: p.id, reason: err.message };
      nulls++;
      failDetail.push(`${p.id}: ${err.message}`);
      console.warn(`ratings/${p.id}: FALLO — ${err.message}`);
    }
    await pause();
  }

  output.updatedAt = new Date().toISOString();

  // Segunda + tercera pasada: adj y score sobre el dataset completo (incluye
  // entradas reanudadas). La estandarización z es de toda la liga.
  const { mu, sampleSize, muAdj, sdAdj, degenerate } = applyScores(output);
  const finalScores = Object.values(output.players)
    .map((e) => e.score)
    .filter((s) => s != null);
  const fMin = finalScores.length > 0 ? Math.min(...finalScores) : null;
  const fMax = finalScores.length > 0 ? Math.max(...finalScores) : null;
  const fMean =
    finalScores.length > 0 ? finalScores.reduce((sum, s) => sum + s, 0) / finalScores.length : null;
  const fSd =
    finalScores.length > 0
      ? Math.sqrt(finalScores.reduce((sum, s) => sum + (s - fMean) ** 2, 0) / finalScores.length)
      : null;
  console.log(
    `\nScore ajustado (adj): mu (media con games >= 10) = ${mu != null ? mu.toFixed(3) : "n/d"} sobre ${sampleSize} jugadores · PRIOR_GAMES=${PRIOR_GAMES} · WINRATE_WEIGHT=${WINRATE_WEIGHT}`,
  );
  console.log(
    `Estandarización z: muAdj=${muAdj != null ? muAdj.toFixed(3) : "n/d"} · sdAdj=${sdAdj != null ? sdAdj.toFixed(3) : "n/d"} · Z_SPREAD=${Z_SPREAD}${degenerate ? " · DEGENERADO: score = 5 para todos" : ""}`,
  );
  console.log(
    `Score final: min=${fMin != null ? fMin.toFixed(2) : "n/d"} · max=${fMax != null ? fMax.toFixed(2) : "n/d"} · media=${fMean != null ? fMean.toFixed(3) : "n/d"} · stdev=${fSd != null ? fSd.toFixed(3) : "n/d"} (${finalScores.length} jugadores)`,
  );

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `\nEscrito ${path.relative(ROOT, OUTPUT_PATH)} — ${ok}/${targets.length} con nota · ${nulls} sin dato · ${skipped} saltados por cache (<24 h)`,
  );
  if (failDetail.length) {
    console.log("Sin nota:");
    for (const d of failDetail) console.log(`  - ${d}`);
  }
}

main().catch((err) => {
  console.error("ERROR inesperado:", err?.stack ?? err);
  process.exit(1);
});
