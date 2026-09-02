#!/usr/bin/env node
/**
 * sync-gcd.mjs — Verificación opcional: descarga el wikitexto del GCD EMEA
 * (espejo del Sheet, NO fuente independiente) y compara fecha fin / equipo /
 * rol por jugador contra data/players.json.
 *
 * Uso: node scripts/sync-gcd.mjs
 * Salida: data/raw/gcd-diff.json (solo informativa; nunca escribe los JSON generados).
 * Si la descarga falla: avisa y termina con exit 0.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GCD_URL =
  "https://lol.fandom.com/rest.php/v1/page/Archive%3AGlobal_Contract_Database%2FEMEA%2FCurrent";
const PLAYERS_PATH = path.join(ROOT, "data", "players.json");
const OVERRIDES_PATH = path.join(ROOT, "data", "overrides.json");
const DIFF_PATH = path.join(ROOT, "data", "raw", "gcd-diff.json");

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const ROLE_MAP = {
  MID: "mid", TOP: "top", JUNGLE: "jungle", ADC: "adc", BOT: "adc", SUPPORT: "support",
};

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanWs(s) {
  return s.replace(/\s+/g, " ").trim();
}

function parseContractDate(raw) {
  const m = cleanWs(raw).match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parsea la tabla wikitexto del GCD: filas separadas por "|-", celdas por "||". */
function parseGcdRows(wikitext) {
  const rows = [];
  // Solo el primer bloque {| ... |} (la tabla Current)
  const table = wikitext.slice(wikitext.indexOf("{|"), wikitext.indexOf("|}"));
  const body = table.split(/^\|-.*$/m).slice(1);
  for (const chunk of body) {
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("|"));
    if (lines.length === 0) continue;
    // Una fila lógica: todas las líneas "|" se juntan (por si acaso) y se parten por "||"
    const cells = lines
      .join("\n")
      .slice(1)
      .split("||")
      .map((c) => cleanWs(c.replace(/\n/g, " ")));
    if (cells.length < 7) continue;
    const [league, team, name, role, , , date] = cells;
    if (!name || !team) continue; // fila de relleno
    rows.push({ league: cleanWs(league), team: cleanWs(team), name: cleanWs(name), role: cleanWs(role), dateRaw: cleanWs(date) });
  }
  return rows;
}

async function main() {
  let wikitext;
  try {
    const res = await fetch(GCD_URL, { headers: { "User-Agent": BROWSER_UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const json = await res.json();
    wikitext = json.source ?? "";
    if (!wikitext) throw new Error("respuesta sin campo 'source'");
  } catch (err) {
    console.warn(`AVISO: no se pudo descargar el GCD (${err.message}). Se continúa sin verificación (exit 0).`);
    process.exit(0);
  }

  const gcdRows = parseGcdRows(wikitext).filter((r) => r.league === "LEC");
  if (!existsSync(PLAYERS_PATH)) {
    console.error(`ERROR: no existe ${path.relative(ROOT, PLAYERS_PATH)}. Ejecuta primero build-data.`);
    process.exit(1);
  }
  const players = JSON.parse(await readFile(PLAYERS_PATH, "utf8"));
  let textDates = {};
  if (existsSync(OVERRIDES_PATH)) {
    const ov = JSON.parse(await readFile(OVERRIDES_PATH, "utf8"));
    textDates = ov.textDates ?? {};
  }

  const byId = new Map(players.map((p) => [p.id, p]));
  const differences = [];
  const unmatchedGcd = [];
  let matched = 0;

  for (const row of gcdRows) {
    const id = slugify(row.name);
    const local = byId.get(id);
    if (!local) {
      unmatchedGcd.push({ name: row.name, team: row.team, role: row.role, dateRaw: row.dateRaw });
      continue;
    }
    matched++;
    const gcdEnd = parseContractDate(row.dateRaw) ?? textDates[row.dateRaw]?.contractEnd ?? null;
    const gcdRole = ROLE_MAP[row.role.toUpperCase()] ?? (row.role.toUpperCase().includes("COACH") ? "coach" : null);
    const diffs = [];
    if (gcdEnd && local.contractEnd !== gcdEnd) {
      diffs.push({ field: "contractEnd", local: local.contractEnd, gcd: gcdEnd });
    }
    if (!gcdEnd && local.contractEnd) {
      diffs.push({ field: "contractEnd", local: local.contractEnd, gcd: row.dateRaw || null });
    }
    if (gcdRole && local.role !== gcdRole) {
      diffs.push({ field: "role", local: local.role, gcd: gcdRole });
    }
    if (diffs.length > 0) {
      differences.push({ playerId: id, name: local.name, diffs });
    }
  }

  const missingInGcd = players
    .filter((p) => !gcdRows.some((r) => slugify(r.name) === p.id))
    .map((p) => ({ playerId: p.id, name: p.name }));

  const result = {
    generatedAt: new Date().toISOString(),
    source: GCD_URL,
    note: "El GCD es espejo del Sheet (backup automático); las discrepancias suelen ser solo desfase de sincronización.",
    gcdLecRows: gcdRows.length,
    checked: players.length,
    matched,
    differencesCount: differences.length,
    differences,
    unmatchedGcd,
    missingInGcd,
  };

  await mkdir(path.dirname(DIFF_PATH), { recursive: true });
  await writeFile(DIFF_PATH, JSON.stringify(result, null, 2) + "\n");

  console.log("=== sync-gcd: verificación contra GCD ===");
  console.log(`Filas LEC en GCD: ${gcdRows.length} · Comparados: ${matched} · Jugadores locales: ${players.length}`);
  console.log(`Discrepancias: ${differences.length} · En GCD pero no en players.json: ${unmatchedGcd.length} · En players.json pero no en GCD: ${missingInGcd.length}`);
  for (const d of differences) {
    console.log(`  ✗ ${d.name}: ${d.diffs.map((x) => `${x.field} local=${x.local} gcd=${x.gcd}`).join("; ")}`);
  }
  for (const u of unmatchedGcd) console.log(`  ? Solo en GCD: ${u.name} (${u.team}, ${u.dateRaw || "sin fecha"})`);
  for (const m of missingInGcd) console.log(`  ? Solo en players.json: ${m.name}`);
  console.log(`Detalle en ${path.relative(ROOT, DIFF_PATH)}`);
  if (differences.length === 0 && unmatchedGcd.length === 0 && missingInGcd.length === 0) {
    console.log("OK: sin discrepancias entre Sheet y GCD.");
  }
}

main().catch((err) => {
  console.warn(`AVISO: error inesperado en sync-gcd (${err?.message ?? err}). Se continúa (exit 0).`);
  process.exit(0);
});
