# AGENTS.md

Instrucciones para agentes ZCode trabajando en este workspace.

## Propósito

Dashboard web (SPA estática) con los rosters de los 10 equipos LEC (League of Legends EMEA):
tarjetas de jugador (foto + rol + badge de estado de contrato), foco en quién termina contrato
en la offseason 2026, filtro por agente/agencia, vista tabla ordenable y ficha de jugador.
Diseño propio (no clon de Sheepesports), modo oscuro + claro, responsive.

## Estado actual

**M1–M3 implementados y verificados** (build y tsc en verde). Stack real: React 19 + Vite 8 +
Tailwind CSS 4.3 + TypeScript 5.9, fuente Inter self-hosted (@fontsource). Queda pendiente:
rellenar agentes/agencias/nacionalidades en `data/overrides.json` (todo a null), `teamHistory`
de los jugadores (M3, manual desde GCD), despliegue y M4 (movimientos/rumores).
Dato 2026 del Sheet: 85 personas LEC (59 jugadores + 26 coaches), 55 contratos terminan en
2026, 25 en 2027, 5 en 2028.

## Documentación — leer antes de tocar nada

| Fichero | Contenido |
|---|---|
| `README.md` | Requisitos del producto (fuentes de datos, funcionalidades, alcance). En español; la UI también será en español. |
| `PLAN.md` | Plan de implementación aprobado: stack, estructura de carpetas, modelo de datos, pipeline, milestones M1–M4. Seguirlo salvo indicación contraria del usuario. |
| `bmw-m-DESIGN.md` | Guía de diseño modo **oscuro** (tema BMW M). |
| `dmw-DESIGN.md` | Guía de diseño modo **claro** (tema BMW corporativo). Ojo: el README la llama erróneamente "bmw-DESIGN.md"; el fichero real es `dmw-DESIGN.md`. |

## Hechos de datos verificados (no re-investigar)

- **Fuente primaria = Google Sheet**, descargable como CSV sin auth por pestaña:
  `https://docs.google.com/spreadsheets/d/1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o/pub?gid=148326031&single=true&output=csv`
  (gid `148326031` = pestaña EMEA; el `pubhtml` no es parseable).
- **El GCD de Leaguepedia NO es fuente independiente**: es un espejo wikitext del mismo Sheet
  (backup automático cada 1–3 días). Solo sirve para verificación/histórico vía
  `https://lol.fandom.com/rest.php/v1/page/Archive%3AGlobal_Contract_Database%2FEMEA%2FCurrent`.
- **La API `api.php`/`cargoquery` de Fandom está rate-limited: no usarla como dependencia.**
- **No existe columna de agente/agencia ni nacionalidad en ninguna fuente** → se rellenan a
  mano en `data/overrides.json`. Los scripts generadores NUNCA deben escribir ese fichero.
- Equipos LEC 2026 según el Sheet: Fnatic, G2, GIANTX, Karmine Corp, Movistar KOI,
  **Natus Vincere**, SK Gaming, **Shifters**, Team Heretics, Team Vitality. La lista canónica
  sale del Sheet, no de la memoria.
- Casi todos los contratos LEC vencen el 16-nov-2026 → el badge "Termina 2026" resaltará a
  casi toda la liga; diseñar la jerarquía para eso.
- CSV sucio: roles inconsistentes (`MID`/`Mid`, `Bot`/`ADC`), ~24 fechas textuales
  ("Day After Worlds 2026"), filas de relleno. Normalizar en `build-data.mjs`.

## Arquitectura prevista (límites que importan)

- Stack: **Vite + React + TypeScript + Tailwind CSS v4**, SPA sin backend ni router.
- El navegador **solo consume JSON local** (`data/players.json`, `teams.json`, `agents.json`).
  Toda descarga de fuentes externas ocurre en scripts Node de `scripts/` (`fetch-sheet.mjs`,
  `sync-gcd.mjs`, `build-data.mjs`, `download-assets.mjs`), nunca en runtime.
- Flujo en un sentido: Sheet → CSV crudo (`data/raw/`) → merge con `overrides.json` → JSON
  generados. `overrides.json` es la única pieza editable a mano; los demás JSON de `data/`
  son generados (no editarlos directamente).
- Assets (fotos/logos) se descargan **una vez en build** y se **commitean** en
  `public/assets/` — el deploy nunca depende de Fandom. Fallback de foto: avatar de
  iniciales en runtime, sin asset.
- Tema dark/light con variables CSS bajo `:root[data-theme="dark|light"]` + toggle en
  `localStorage` + script anti-FOUC en `index.html`.
- Vista "2027" (`src/components/Roster2027.tsx` + `hooks/useProjections.ts`): árbol editable
  equipo→jugador. Por defecto cada jugador cuelga de su equipo si su contrato va más allá de
  2026, y del pool de libres si expira (con filtro por texto y rol); el usuario mueve con drag
  & drop o clic-clic. Incluye buscador EN VIVO contra Leaguepedia (`lib/leaguepedia.ts`,
  api.php con origin=*: la única llamada externa desde el navegador) que extrae nombre,
  equipo, rol, foto y "Contract Expires" del infoboxPlayer y añade jugadores importados
  (`ext-<slug>`, hotlink de foto). Overrides e importados viven en
  `localStorage('scouting2027-projections')` (v2: `{assignments, imports}`) y se exportan
  como `data/projections.json` para commitearlos. Los SVG de rol son blancos: en tema claro
  `app.css` los invierte (.role-icon).
- Futuro (M4): `data/moves.json` para rosters 2027/rumores; no reescribir el modelo actual
  por ello (el plan ya lo contempla).

## Reglas de diseño (de las guías, obligatorias)

- Usar solo los tokens documentados en las guías (colores hex exactos, tipografía Inter como
  sustituta de BMW Type Next Latin, pesos 700/300, max-width 1200px, esquinas rectas,
  elevación por escalones de superficie — sin sombras).
- Acento de interacción único `#1c69d4` en ambos temas; semánticos unificados
  `success #22c55e / warning #f59e0b / danger #dc2626`; el rojo `#e22718` solo para la firma
  tricolor M.
- El badge de contrato es el único elemento saturado de la tarjeta: ámbar relleno para
  "Termina 2026", verde discreto para contratos largos, rojo para free agent, gris si hay
  dato desconocido.
- Filtro de agente sin colores nuevos: resaltar (borde azul) en parrilla, aislar (opacity
  0.35) en tabla.

## Comandos (existentes en package.json)

- `npm run dev` / `npm run build` / `npm run preview` — desarrollo y build estático (Vite; el build ejecuta `tsc --noEmit` antes)
- `npm run fetch` — baja CSV del Sheet a `data/raw/`
- `npm run build-data` — CSV + overrides → JSON generados (acepta `--seed-overrides` para añadir claves que falten sin tocar valores)
- `npm run refresh` — fetch + build-data
- `npm run verify-gcd` — compara contra el wikitexto del GCD (solo avisa, nunca sobreescribe)
- `npm run download-assets` — descarga logos/fotos/SVGs de roles (reanudable, `--force` para re-descargar)

## Gotchas

- Idioma del proyecto: español (docs y UI). Nombres propios de roles (Top/Mid/ADC) quedan
  en inglés esports.
- Fandom bloquea curl con 403 en páginas HTML; las fotos de jugador se obtienen parseando
  el HTML renderizado vía `rest.php/v1/page/<ID>/html` (tabla `id="infoboxPlayer"`), no con
  `prop=pageimages` (devuelve fotos antiguas).
- Logos de equipo: fichero `<Equipo>logo std.png` en Fandom (60×25 px, verificado para los 10).
- Los scripts contra Fandom deben ir con pausas de 2–3 s entre peticiones.
