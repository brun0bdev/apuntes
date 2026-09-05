#!/usr/bin/env node
/**
 * deploy-web.mjs — Despliega el build estático (dist/) a ibrunob/webBrunoB.
 *
 * Clona el repo de publicación (rama main) con un token, vacía la carpeta lec/
 * (conservando README.md y transfers_2026_winter.csv), copia dist/ y pushea.
 * Es idempotente: si el build es idéntico a lo publicado, no crea ningún commit.
 *
 * Requisitos previos:
 *   - Env DEPLOY_TOKEN (PAT fine-grained con Contents: RW sobre ibrunob/webBrunoB).
 *     En CI lo inyecta el workflow refresh-data.yml desde el secreto WEBBRUNOB_TOKEN.
 *   - dist/index.html existente (ejecutar antes: npm run build -- --base=./).
 *
 * Uso: node scripts/deploy-web.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const CLONE_DIR = "/tmp/webbrunob-deploy";
const PUBLISH_REPO = "github.com/ibrunob/webBrunoB.git";
const PUBLISH_BRANCH = "main";

// Ficheros de lec/ que NO se borran al vaciar antes de copiar el build
const KEEP = new Set(["README.md", "transfers_2026_winter.csv"]);

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function todayIso() {
  // Fecha local en formato YYYY-MM-DD
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function main() {
  // 1. Validaciones previas: token y build presente
  const token = process.env.DEPLOY_TOKEN;
  if (!token) {
    fail(
      "Falta la variable de entorno DEPLOY_TOKEN. " +
        "En CI viene del secreto WEBBRUNOB_TOKEN (ver .github/workflows/refresh-data.yml). " +
        "En local: export DEPLOY_TOKEN=<pat-con-contents-rw-en-webBrunoB>",
    );
  }
  if (!existsSync(path.join(DIST, "index.html"))) {
    fail(
      `No existe ${path.join(DIST, "index.html")}. Genera el build primero:\n` +
        "  npm run build -- --base=./",
    );
  }

  // 2. Clonar el repo de publicación en /tmp (limpiando cualquier resto previo)
  rmSync(CLONE_DIR, { recursive: true, force: true });
  execSync(
    `git clone --depth 1 --branch ${PUBLISH_BRANCH} https://x-access-token:${token}@${PUBLISH_REPO} ${CLONE_DIR}`,
    { stdio: "inherit" },
  );

  // 3. Vaciar lec/ excepto los ficheros protegidos (KEEP); crearla si no existe
  const lec = path.join(CLONE_DIR, "lec");
  if (existsSync(lec)) {
    for (const entry of readdirSync(lec)) {
      if (!KEEP.has(entry)) {
        rmSync(path.join(lec, entry), { recursive: true, force: true });
      }
    }
  } else {
    mkdirSync(lec, { recursive: true });
  }

  // 4. Copiar el build a lec/
  cpSync(DIST, lec, { recursive: true });

  // 5. Idempotencia: si tras copiar no hay cambios, no crear commit ni pushear
  const status = execSync("git status --porcelain lec", {
    cwd: CLONE_DIR,
    encoding: "utf8",
  }).trim();
  if (status === "") {
    console.log("El build es idéntico a lo publicado. No hay nada que desplegar.");
    process.exit(0);
  }

  // 6. Commitear y pushear el deploy con identidad del bot de GitHub Actions
  execSync('git config user.name "github-actions[bot]"', { cwd: CLONE_DIR });
  execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', {
    cwd: CLONE_DIR,
  });
  execSync("git add -A lec", { cwd: CLONE_DIR });
  execSync(`git commit -m "lec: auto-deploy ${todayIso()}"`, { cwd: CLONE_DIR, stdio: "inherit" });
  execSync(`git push origin ${PUBLISH_BRANCH}`, { cwd: CLONE_DIR, stdio: "inherit" });
  console.log(`Deploy completado: ${PUBLISH_REPO.replace("github.com/", "")} (rama ${PUBLISH_BRANCH})`);
}

main();
