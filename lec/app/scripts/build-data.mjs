#!/usr/bin/env node
/**
 * build-data.mjs — Lee data/raw/latest.csv + data/overrides.json y genera
 * data/teams.json, data/players.json y data/agents.json (esquema en PLAN.md §3).
 *
 * Uso: node scripts/build-data.mjs [--seed-overrides]
 *   --seed-overrides  Añade a overrides.json las claves vacías de los jugadores
 *                     LEC que falten (nunca toca claves existentes). Único caso
 *                     en el que este script escribe overrides.json.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = path.join(ROOT, "data", "raw", "latest.csv");
const OVERRIDES_PATH = path.join(ROOT, "data", "overrides.json");
const DATA_DIR = path.join(ROOT, "data");
const PLAYERS_ASSETS_DIR = path.join(ROOT, "public", "assets", "players");

const SEED_OVERRIDES = process.argv.slice(2).includes("--seed-overrides");

// ---------------------------------------------------------------------------
// Lista canónica de equipos LEC (mapeo Team del Sheet → id corto).
// Si el Sheet añade/renombra un equipo, actualizar aquí: el script fallará
// con error duro hasta entonces.
// ---------------------------------------------------------------------------
const CANONICAL_TEAMS = [
  { id: "fnc", sheetName: "Fnatic", abbreviation: "FNC", color: "#ff5900" },
  { id: "g2", sheetName: "G2 Esports", abbreviation: "G2", color: "#c0c0c0" },
  { id: "gx", sheetName: "GIANTX", abbreviation: "GX", color: "#e63946" },
  { id: "kc", sheetName: "Karmine Corp", abbreviation: "KC", color: "#29c5f6" },
  { id: "koi", sheetName: "Movistar KOI", abbreviation: "MKOI", color: "#00b8a9" },
  { id: "navi", sheetName: "Natus Vincere", abbreviation: "NAVI", color: "#ffd200" },
  { id: "sk", sheetName: "SK Gaming", abbreviation: "SK", color: "#35a7e0" },
  { id: "shf", sheetName: "Shifters", abbreviation: "SHF", color: "#7a5cff" },
  { id: "th", sheetName: "Team Heretics", abbreviation: "TH", color: "#9aa4b2" },
  { id: "vit", sheetName: "Team Vitality", abbreviation: "VIT", color: "#ffe500" },
];

// Resolución por defecto de fechas textuales (seeden en overrides.json si no existe).
const DEFAULT_TEXT_DATES = {
  "Day After Worlds 2026": {
    display: "Post-Worlds 2026",
    contractEnd: "2026-11-16",
    note: "fecha estimada (fin de temporada)",
  },
  "Day After Worlds 2027": {
    display: "Post-Worlds 2027",
    contractEnd: "2027-11-16",
    note: "fecha estimada (fin de temporada)",
  },
  "Day After Worlds 2028": {
    display: "Post-Worlds 2028",
    contractEnd: "2028-11-16",
    note: "fecha estimada (fin de temporada)",
  },
};

const ROLE_MAP = {
  MID: "mid",
  TOP: "top",
  JUNGLE: "jungle",
  ADC: "adc",
  BOT: "adc",
  SUPPORT: "support",
};

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

const warnings = [];
const errors = [];

// ---------------------------------------------------------------------------
// Parser CSV propio: campos entrecomillados con comas, comillas dobles
// escapadas ("") y saltos de línea dentro de comillas.
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (ch === "\r") {
      // ignorar (CRLF)
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

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

/** "November 16, 2026" → "2026-11-16" (fin de contrato a las 23:59 UTC). */
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

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Busca el fichero real de foto descargado para un id (png/jpg/webp/...). */
async function detectPhotoPath(id) {
  if (!existsSync(PLAYERS_ASSETS_DIR)) return null;
  const files = await readdir(PLAYERS_ASSETS_DIR);
  const exts = ["png", "jpg", "jpeg", "webp", "gif"];
  for (const ext of exts) {
    if (files.includes(`${id}.${ext}`)) return `assets/players/${id}.${ext}`;
  }
  return null;
}

function writeJsonpretty(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

// ---------------------------------------------------------------------------

async function loadOverrides() {
  if (!existsSync(OVERRIDES_PATH)) {
    if (SEED_OVERRIDES) {
      return { textDates: { ...DEFAULT_TEXT_DATES }, players: {} };
    }
    errors.push(
      `No existe ${path.relative(ROOT, OVERRIDES_PATH)}. Créalo a mano o ejecuta: node scripts/build-data.mjs --seed-overrides`
    );
    return { textDates: {}, players: {} };
  }
  try {
    const raw = JSON.parse(await readFile(OVERRIDES_PATH, "utf8"));
    return {
      textDates: raw.textDates ?? {},
      players: raw.players ?? {},
    };
  } catch (err) {
    errors.push(`overrides.json no es JSON válido: ${err.message}`);
    return { textDates: {}, players: {} };
  }
}

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`ERROR: no existe ${path.relative(ROOT, CSV_PATH)}. Ejecuta primero: node scripts/fetch-sheet.mjs`);
    process.exit(1);
  }
  const csvText = await readFile(CSV_PATH, "utf8");
  const rows = parseCsv(csvText);

  // Fila 0: "THIS SHEET WAS LAST UPDATED ON:,8/5/2026 2:52:36,..."
  let sheetUpdatedAt = null;
  if (rows.length > 0 && /LAST UPDATED/i.test(rows[0][0] ?? "")) {
    sheetUpdatedAt = cleanWs(rows[0][1] ?? "") || null;
  }

  // Localizar fila de cabecera (primera con League, Team, Official Summoner Name...).
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (cleanWs(rows[i][0] ?? "").toLowerCase() === "league") { headerIdx = i; break; }
  }
  if (headerIdx === -1) {
    console.error("ERROR: no se encontró la fila de cabecera (League, Team, ...) en el CSV.");
    process.exit(1);
  }
  const header = rows[headerIdx].map(cleanWs);
  const col = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const cLeague = col("League");
  const cTeam = col("Team");
  const cName = col("Official Summoner Name");
  const cRole = col("Main Role");
  const cFirst = col("Legal First Name");
  const cLast = col("Legal Family Name");
  const cEnd = header.findIndex((h) => /^Contract End/i.test(h));
  if ([cLeague, cTeam, cName, cRole, cFirst, cLast, cEnd].some((i) => i === -1)) {
    console.error(`ERROR: cabecera del CSV inesperada: ${JSON.stringify(header)}`);
    process.exit(1);
  }

  const overrides = await loadOverrides();
  const textDates = { ...DEFAULT_TEXT_DATES, ...overrides.textDates };

  // ------------------------------------------------------------------
  // Procesado de filas
  // ------------------------------------------------------------------
  const players = [];
  const seenIds = new Map();
  const usedTextDates = new Map();
  const unknownLecTeams = new Map();
  let currentLeague = "";
  let fillerDiscarded = 0;
  let otherLeaguesRows = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const league = cleanWs(r[cLeague] ?? "") || currentLeague;
    if (cleanWs(r[cLeague] ?? "")) currentLeague = league;
    const team = cleanWs(r[cTeam] ?? "");
    const name = cleanWs(r[cName] ?? "");
    const roleRaw = cleanWs(r[cRole] ?? "");
    const first = cleanWs(r[cFirst] ?? "");
    const last = cleanWs(r[cLast] ?? "");
    const dateRaw = cleanWs(r[cEnd] ?? "");

    if (league !== "LEC") { otherLeaguesRows++; continue; }
    if (!name || !team) { fillerDiscarded++; continue; } // fila de relleno

    // Rol
    const roleKey = roleRaw.toUpperCase();
    let role = null;
    let isCoach = false;
    if (ROLE_MAP[roleKey]) {
      role = ROLE_MAP[roleKey];
    } else if (roleKey.includes("COACH")) {
      role = "coach";
      isCoach = true;
    } else {
      warnings.push(`Fila ${i + 1}: rol no reconocido "${roleRaw}" para "${name}" (${team}) — fila descartada.`);
      continue;
    }

    // Equipo canónico
    const canonical = CANONICAL_TEAMS.find((t) => t.sheetName === team);
    if (!canonical) {
      const list = unknownLecTeams.get(team) ?? [];
      list.push(name);
      unknownLecTeams.set(team, list);
      continue;
    }

    // id estable
    const id = slugify(name);
    if (!id) {
      warnings.push(`Fila ${i + 1}: no se pudo generar slug para "${name}" — fila descartada.`);
      continue;
    }
    if (seenIds.has(id)) {
      errors.push(`Id duplicado "${id}": "${name}" (fila ${i + 1}) colisiona con "${seenIds.get(id).name}" (fila ${seenIds.get(id).line}).`);
      continue;
    }
    seenIds.set(id, { name, line: i + 1 });

    // Fecha de contrato
    let contractEnd = null;
    let contractStatus = "unknown";
    let dateNote = null;
    if (dateRaw) {
      const parsed = parseContractDate(dateRaw);
      if (parsed) {
        contractEnd = parsed;
        contractStatus = "active";
      } else if (textDates[dateRaw]) {
        const res = textDates[dateRaw];
        contractEnd = res.contractEnd;
        contractStatus = "active";
        dateNote = [res.display, res.note].filter(Boolean).join(" — ");
        usedTextDates.set(dateRaw, (usedTextDates.get(dateRaw) ?? 0) + 1);
      } else {
        contractStatus = "unknown";
        warnings.push(`Fila ${i + 1}: fecha no parseable ni resuelta en overrides.textDates: "${dateRaw}" (${name}) → contractStatus "unknown".`);
      }
    }
    if (contractEnd && contractEnd < todayIso()) {
      warnings.push(`"${name}" (${team}): contrato ya vencido (${contractEnd}) según el Sheet; marcado "active" por tener fecha.`);
    }

    // Overrides manuales (wikiPage: título de página en Fandom si difiere del
    // Summoner Name — p. ej. páginas desambiguadas "Noah (Oh Hyeon-taek)").
    const ov = overrides.players[id] ?? {};
    const wikiTitle = ov.wikiPage ?? name;
    const manualNotes = typeof ov.notes === "string" ? ov.notes.trim() : "";
    const notes = [manualNotes, dateNote].filter(Boolean).join(" · ");

    players.push({
      id,
      name,
      realName: [first, last].filter(Boolean).join(" "),
      teamId: canonical.id,
      role,
      isCoach,
      nationality: ov.nationality ?? null,
      contractEnd,
      contractStatus,
      agentId: ov.agent ? slugify(ov.agent) : null,
      // Si aún no hay fichero descargado dejamos la ruta esperada (.png: así
      // guarda las fotos download-assets.mjs); el frontend usa avatar de
      // iniciales como fallback si no existe.
      photo: (await detectPhotoPath(id)) ?? `assets/players/${id}.png`,
      teamHistory: [],
      sourceUrl: `https://lol.fandom.com/wiki/${encodeURIComponent(wikiTitle).replace(/%20/g, "_")}`,
      notes,
    });
  }

  // Equipos LEC desconocidos en el Sheet con jugadores: error duro (actualizar
  // CANONICAL_TEAMS de forma consciente antes de regenerar).
  for (const [team, names] of unknownLecTeams) {
    errors.push(
      `Equipo LEC "${team}" (${names.length} filas con nombre) no está en CANONICAL_TEAMS — filas descartadas. Actualiza la lista canónica en build-data.mjs.`
    );
  }

  // Orden estable (diff-friendly): orden canónico de equipos, coaches al final, luego rol y nombre.
  const teamOrder = new Map(CANONICAL_TEAMS.map((t, i) => [t.id, i]));
  const roleOrder = { top: 0, jungle: 1, mid: 2, adc: 3, support: 4, coach: 5 };
  players.sort(
    (a, b) =>
      teamOrder.get(a.teamId) - teamOrder.get(b.teamId) ||
      Number(a.isCoach) - Number(b.isCoach) ||
      (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99) ||
      a.name.localeCompare(b.name, "en")
  );

  // ------------------------------------------------------------------
  // teams.json
  // ------------------------------------------------------------------
  const teams = CANONICAL_TEAMS.map((t) => ({
    id: t.id,
    name: t.sheetName,
    slug: t.id,
    abbreviation: t.abbreviation,
    logo: `assets/teams/${t.id}.webp`,
    color: t.color,
  }));

  // ------------------------------------------------------------------
  // agents.json (derivado de overrides; vacío si no hay agentes manuales)
  // ------------------------------------------------------------------
  const agentsMap = new Map();
  for (const p of players) {
    const ov = overrides.players[p.id] ?? {};
    const link = (rawName, type) => {
      if (!rawName) return;
      const aid = slugify(rawName);
      if (!agentsMap.has(aid)) {
        agentsMap.set(aid, { id: aid, name: rawName, type, website: ov.agentWebsite ?? null, playerIds: [] });
      }
      agentsMap.get(aid).playerIds.push(p.id);
    };
    link(ov.agent, "agent");
    link(ov.agency, "agency");
  }
  const agents = [...agentsMap.values()].sort(
    (a, b) => b.playerIds.length - a.playerIds.length || a.name.localeCompare(b.name, "en")
  );

  // ------------------------------------------------------------------
  // Seed de overrides.json (solo con --seed-overrides; nunca sobrescribe)
  // ------------------------------------------------------------------
  if (SEED_OVERRIDES) {
    const base = existsSync(OVERRIDES_PATH)
      ? JSON.parse(await readFile(OVERRIDES_PATH, "utf8"))
      : { textDates: {}, players: {} };
    base.textDates = { ...DEFAULT_TEXT_DATES, ...(base.textDates ?? {}) };
    base.players = base.players ?? {};
    let added = 0;
    for (const p of players) {
      if (!base.players[p.id]) {
        base.players[p.id] = { agent: null, agency: null, nationality: null, notes: "" };
        added++;
      }
    }
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(OVERRIDES_PATH, writeJsonpretty(base));
    console.log(`overrides.json: ${added} claves de jugador añadidas (existentes intactas).`);
  }

  // ------------------------------------------------------------------
  // Validación
  // ------------------------------------------------------------------
  const teamIds = new Set(teams.map((t) => t.id));
  for (const p of players) {
    if (!teamIds.has(p.teamId)) errors.push(`Player "${p.id}": teamId "${p.teamId}" no canónico.`);
    if (!["top", "jungle", "mid", "adc", "support", "coach"].includes(p.role)) {
      errors.push(`Player "${p.id}": rol inválido "${p.role}".`);
    }
    if (p.contractStatus !== "unknown" && !p.contractEnd) {
      errors.push(`Player "${p.id}": contractStatus "${p.contractStatus}" sin contractEnd.`);
    }
  }
  const ids = new Set(players.map((p) => p.id));
  if (ids.size !== players.length) errors.push("Hay ids de jugador duplicados.");
  // Overrides huérfanos
  for (const key of Object.keys(overrides.players)) {
    if (!ids.has(key)) warnings.push(`overrides.players["${key}"] huérfano: no coincide con ningún jugador del Sheet.`);
  }

  // ------------------------------------------------------------------
  // Escritura de JSON generados
  // ------------------------------------------------------------------
  if (errors.length === 0) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(path.join(DATA_DIR, "players.json"), writeJsonpretty(players));
    await writeFile(path.join(DATA_DIR, "teams.json"), writeJsonpretty(teams));
    await writeFile(path.join(DATA_DIR, "agents.json"), writeJsonpretty(agents));
  }

  // ------------------------------------------------------------------
  // Resumen
  // ------------------------------------------------------------------
  const coaches = players.filter((p) => p.isCoach).length;
  const unknowns = players.filter((p) => p.contractStatus === "unknown").length;
  const expiring2026 = players.filter(
    (p) => p.contractStatus === "active" && p.contractEnd?.slice(0, 4) === "2026"
  ).length;
  console.log("\n=== build-data: resumen ===");
  if (sheetUpdatedAt) console.log(`Sheet actualizado: ${sheetUpdatedAt}`);
  console.log(`Filas otras ligas descartadas (LFL/PRM/LES/SL/TCL): ${otherLeaguesRows}`);
  console.log(`Filas de relleno descartadas (sin nombre o sin equipo): ${fillerDiscarded}`);
  console.log(`Jugadores LEC: ${players.length - coaches} · Coaches: ${coaches} · Total: ${players.length}`);
  console.log(`Contratos "active": ${players.filter((p) => p.contractStatus === "active").length} · "unknown": ${unknowns}`);
  console.log(`Terminan en 2026 (badge clave): ${expiring2026}`);
  console.log(`Fechas textuales resueltas: ${[...usedTextDates.entries()].map(([k, v]) => `"${k}" x${v}`).join(", ") || "ninguna"}`);
  console.log(`Fechas textuales SIN resolver: ${Object.keys(textDates).filter((k) => k.toLowerCase().includes("worlds") && !usedTextDates.has(k)).join(", ") || "ninguna"}`);
  console.log(`Agentes/agencias en agents.json: ${agents.length}`);
  console.log(`Equipos: ${teams.map((t) => t.id).join(", ")}`);

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  if (errors.length) {
    console.error(`\nERRORES DUROS (${errors.length}) — no se han escrito los JSON:`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log("\nOK: data/players.json, data/teams.json, data/agents.json generados.");
}

main().catch((err) => {
  console.error("ERROR inesperado:", err?.stack ?? err);
  process.exit(1);
});
