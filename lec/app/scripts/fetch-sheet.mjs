#!/usr/bin/env node
/**
 * fetch-sheet.mjs — Descarga el CSV de la pestaña EMEA del Sheet de contratos
 * y lo guarda como snapshot datado + copia latest.csv.
 *
 * Uso: node scripts/fetch-sheet.mjs
 * Salida: data/raw/emea-YYYY-MM-DD.csv  +  data/raw/latest.csv
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = path.join(ROOT, "data", "raw");

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o/pub?gid=148326031&single=true&output=csv";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function todayIso() {
  // Fecha local en formato YYYY-MM-DD
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  process.stdout.write(`Descargando CSV EMEA...\n  ${SHEET_CSV_URL}\n`);
  const res = await fetch(SHEET_CSV_URL, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/csv,*/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    console.error(`ERROR: HTTP ${res.status} ${res.statusText} al descargar el Sheet`);
    process.exit(1);
  }
  const body = Buffer.from(await res.arrayBuffer());

  // Sanidad mínima: el CSV debe tener cabecera "League" y algo de contenido.
  const head = body.subarray(0, 4096).toString("utf8");
  if (!/"?League"?/i.test(head) || body.length < 500) {
    console.error("ERROR: la respuesta no parece el CSV del Sheet (cabecera 'League' ausente o contenido insuficiente).");
    console.error(`Primeros bytes: ${JSON.stringify(head.slice(0, 200))}`);
    process.exit(1);
  }

  const date = todayIso();
  const datedPath = path.join(RAW_DIR, `emea-${date}.csv`);
  const latestPath = path.join(RAW_DIR, "latest.csv");

  // Si ya existe un snapshot de hoy idéntico, no lo reescribimos (idempotente).
  if (existsSync(datedPath)) {
    const prev = await readFile(datedPath);
    if (prev.equals(body)) {
      process.stdout.write(`Snapshot de hoy ya existía e idéntico: ${path.relative(ROOT, datedPath)}\n`);
    } else {
      await writeFile(datedPath, body);
      process.stdout.write(`Snapshot de hoy actualizado (había cambios): ${path.relative(ROOT, datedPath)}\n`);
    }
  } else {
    await writeFile(datedPath, body);
    process.stdout.write(`Snapshot guardado: ${path.relative(ROOT, datedPath)}\n`);
  }

  await writeFile(latestPath, body);
  const lineCount = body.toString("utf8").split("\n").filter((l) => l.trim().length > 0).length;
  process.stdout.write(`Copia latest.csv actualizada (${(body.length / 1024).toFixed(1)} KB, ${lineCount} líneas no vacías).\n`);
}

main().catch((err) => {
  console.error("ERROR inesperado:", err?.message ?? err);
  process.exit(1);
});
