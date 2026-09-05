# PLAN.md — Scouting LEC 2026 · Plan inicial de implementación

> Síntesis del trabajo de 5 subagentes de investigación: fuentes de datos, assets visuales,
> sistema de diseño, arquitectura/stack y producto/modelo de datos.
> Fuente de requisitos: `README.md`. Guías de diseño: `bmw-m-DESIGN.md` (oscuro) y `dmw-DESIGN.md` (claro).

---

## 0. Resumen del producto

Dashboard SPA con los rosters de los 10 equipos LEC. Cada jugador es una tarjeta
(foto + rol + badge de estado de contrato). Foco: ver **de un vistazo quién termina contrato
en la offseason 2026** y **filtrar por agente/agencia**. Modo oscuro y claro, responsive,
datos como JSON local editable (sin conexión en vivo a fuentes externas desde el navegador).

---

## 1. Hallazgos clave de la investigación (verificados con llamadas reales)

### 1.1 Fuentes de datos — el Sheet manda, el GCD es un espejo

- **Fuente primaria real = Google Sheet** ("League of Legends Esports League-Recognized
  Contract Database"). El `pubhtml` es JS no parseable, pero la **exportación CSV por pestaña
  funciona sin auth**:
  `https://docs.google.com/spreadsheets/d/1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o/pub?gid=148326031&single=true&output=csv`
- Pestaña **EMEA = gid `148326031`** (la del proyecto). Última actualización del Sheet: 8/5/2026.
- Columnas reales EMEA: `League | Team | Official Summoner Name | Main Role | Legal First Name |
  Legal Family Name | Contract End (Month, Day, Year) at 23:59 UTC | IMP Residency | LTR Status |
  (sin nombre) | Bi-/Tri-Code | Team Contact Information`.
- **El GCD de Leaguepedia NO es una fuente independiente**: su wikitexto
  (`rest.php/v1/page/Archive:Global_Contract_Database/EMEA/Current`, campo `source`) es una
  **tabla espejo del mismo Sheet**, respaldada automáticamente cada 1–3 días (~06:50 UTC).
  Útil como verificación y como histórico (revisions), no como fuente canónica.
  La API `api.php`/`cargoquery` de Fandom está **rate-limited y NO es fiable** como dependencia.
- **No existe columna de agente/agencia ni nacionalidad en ninguna fuente** → 100% manual,
  tal como anticipaba el README.
- **Calidad de datos a normalizar**: roles inconsistentes (`MID` vs `Mid`, `Bot` vs `ADC`),
  ~24 fechas textuales del tipo `"Day After Worlds 2026/2027/2028"` (casi todas coaches),
  filas de relleno vacías, cabecera manual no fiable, colores de estado (reserve/inactive)
  perdidos en el CSV.
- ⚠️ **Equipos LEC según el Sheet (2026)**: Fnatic, G2 Esports, GIANTX, Karmine Corp,
  Movistar KOI, **Natus Vincere**, SK Gaming, **Shifters**, Team Heretics, Team Vitality.
  *La lista canónica de equipos sale del Sheet, no de la memoria* (verificar logos de NaVi y
  Shifters en Fandom; `Natus_Vincerelogo_std.png` ya localizado).
- ⚠️ **Insight de producto**: casi todos los contratos LEC vencen el **16-nov-2026** (fecha
  estándar de liga) → el badge "Termina 2026" iluminará a casi todo el roster. El diseño debe
  seguir siendo legible con la mayoría de tarjetas resaltadas (jerarquía por fecha, no solo por
  color: la tabla cronológica gana valor).

### 1.2 Assets — patrones verificados

- **Fotos de jugadores**: el HTML de Fandom da 403 y `prop=pageimages` devuelve fotos
  antiguas. Método fiable: `GET https://lol.fandom.com/rest.php/v1/page/<ID>/html` → parsear
  `<table id="infoboxPlayer">` → primer `<img resource="./File:X">`; el propio HTML trae la
  URL final a 220px en `static.wikia.nocookie.net` (CDN sin bloqueo, soporta
  `scale-to-width-down/N` y webp). Verificado con Caps (foto 2026 actual) y Jankos.
- **Logos de equipos**: patrón verificado al 100% — fichero `<Equipo>logo std.png`
  (p. ej. `G2_Esportslogo_std.png`, `Rogue_(European_Team)logo_std.png`), 60×25 px.
  URL original resoluble con `api.php?action=query&titles=File:X&prop=imageinfo&iiprop=url`.
- **SVGs de roles**: Sheepesports está tras challenge de seguridad (403) y sus hashes
  `/_next/static/media/top.<hash>.svg` **mueren en cada deploy** (fragilidad confirmada;
  los de jun-2026 solo sobreviven en Wayback, sin licencia explícita).
  **Recomendado**: SVGs de posición oficiales del cliente LoL en CommunityDragon
  (política de fan-projects de Riot, estables, verificados 200):
  `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-{top,jungle,middle,bottom,utility}.svg`.
  Coach: SVG propio simple (no existe en esa ruta).
- **Almacenamiento local**: todo se descarga **una vez en build** (script Node con pausas
  2–3 s entre peticiones) y se **commitea** al repo → el deploy nunca depende de Fandom.
  Jugadores a webp 256×256; fallback = avatar de iniciales generado en runtime (sin asset).
  Manifest con fuente y fecha de cada asset.

### 1.3 Diseño — tokens unificados dark/light

Ambas guías comparten ADN (fuente BMW Type Next Latin → sustituta **Inter/system-ui**;
pesos 700 display / 300 body; max-width 1200px; tarjetas padding 24px; **esquinas rectas**;
elevación por escalones de superficie, **sin sombras**). Diferencias a resolver:

- `primary` cambia de significado por tema (blanco en dark, azul en light) → separar
  **acento de interacción** (`#1c69d4`, presente en ambas guías) del bloque primario.
- Semánticos: unificar en `success #22c55e / warning #f59e0b / danger #dc2626` (set de light,
  trío completo); el rojo `#e22718` queda reservado a la firma tricolor M.
- Escalas tipográfica y de espaciado: adoptar la de light (más compacta, granular en 13–20px,
  donde vive este dashboard).

Sistema: variables CSS con `:root[data-theme="dark|light"]`, mismos nombres de variable en
ambos temas, expuestas a Tailwind v4 vía `@theme inline`. Toggle manual persistido en
`localStorage` + script anti-FOUC en `<head>` que respeta `prefers-color-scheme`.

Decisiones de legibilidad "2 segundos":
1. **El badge de contrato es el único elemento saturado** de la tarjeta: "Termina 2026" =
   chip con relleno ámbar + texto negro (`TERMINA 2026` en label-uppercase 1.5px tracking);
   contrato largo = punto verde discreto + "hasta 2030" en caption; free agent = rojo;
   sin dato = gris.
2. 95% neutro; azul `#1c69d4` solo interacción; **tricolor M** (`#0066b1 → #1c69d4 → #e22718`,
   divisor 4px) como firma en cabecera/borde superior de tarjeta de equipo.
3. Filtro de agente **sin colores nuevos**: resaltar = borde 2px azul + fondo elevado;
   aíslar = resto a opacity 0.35.

---

## 2. Stack y arquitectura

**Vite + React + TypeScript + Tailwind CSS v4** (SPA estática, sin backend ni router).

```bash
npm create vite@latest . -- --template react-ts
npm install && npm install -D tailwindcss @tailwindcss/vite
```

- **Estado**: objeto único de filtros en el componente raíz + hook propio `useUrlState`
  (~30 líneas, `URLSearchParams` + `history.replaceState`) → filtros compartibles por URL y
  back-button gratis. Sin zustand/redux (dominio diminuto).
- **Tema**: atributo `data-theme` en `<html>` + `localStorage` + anti-FOUC. Fuera de React.
- **Estructura**:

```
scouting2026/
├── index.html                  # script inline anti-FOUC de tema
├── vite.config.ts              # react + tailwindcss, base './'
├── scripts/                    # Node puro, fuera del bundle
│   ├── fetch-sheet.mjs         # CSV del Sheet → data/raw/emea-YYYY-MM-DD.csv
│   ├── sync-gcd.mjs            # wikitexto GCD (rest.php) → verificación + diff
│   ├── build-data.mjs          # CSV crudo + overrides → data/*.json
│   └── download-assets.mjs     # logos + fotos → public/assets/ (+ manifest.json)
├── data/
│   ├── raw/                    # CSV/wikitexto descargado (gitignore opcional)
│   ├── overrides.json          # ✏️ EDITABLE A MANO: agente, agencia, nacionalidad,
│   │                           #    alias, resolución de fechas textuales
│   ├── players.json            # ⚙️ GENERADO (no editar)
│   ├── teams.json              # ⚙️ GENERADO (lista canónica de equipos + logos)
│   └── agents.json             # ⚙️ GENERADO (índice derivado de overrides)
├── public/assets/
│   ├── teams/{id}.png          # logos 60×25 de Fandom
│   ├── players/{id}.webp       # 256×256 (fallback: iniciales en runtime)
│   └── roles/{top,jungle,mid,adc,support,coach}.svg
└── src/
    ├── styles/tokens.css       # bloques [data-theme="dark"] y [data-theme="light"]
    ├── types/player.ts
    ├── data/players.ts         # import JSON + tipado
    ├── hooks/useUrlState.ts · useTheme.ts
    ├── lib/filters.ts · sort.ts · contract.ts
    └── components/
        ├── Header · ThemeToggle · FilterBar · SearchInput
        ├── TeamGrid · TeamCard · PlayerCard · ContractBadge · RoleIcon
        ├── PlayerTable · SortHeader
        └── PlayerDrawer · EmptyState · Footer
```

- **Pipeline de datos** (flujo en un sentido, nada manual se pisa):
  `npm run fetch` → `npm run build-data` → `npm run refresh` (= ambos + verify opcional).
  `build-data.mjs`: normaliza roles (`Bot`→`adc`, case-insensitive), filtra coaches a
  `isCoach: true`, descarta filas relleno (sin `Official Summoner Name`/`Team` o fuera de la
  lista canónica de 10), parsea fechas `Date.parse("November 16, 2026")`, resuelve fechas
  textuales vía overrides, y hace **merge** `player = sheetRow + overrides[slug] ?? {}`.
  `overrides.json` (claveado por slug del jugador) **nunca lo escribe el generador** → los
  datos manuales (agente, nacionalidad) sobreviven a cualquier refresh; warnings de overrides
  huérfanos y de jugadores sin agente.
- **Actualización periódica** (pendiente del README, resuelto): (1) manual `npm run refresh`
  + commit; (2) GitHub Action semanal que ejecuta el refresh y **abre un PR automático**
  ("chore: refresh data 2026-W36") si el CSV cambió, con diff opcional vs GCD para revisar
  antes de mergear.
- **Despliegue**: GitHub Pages + Actions (`base: './'` en Vite). Si el repo es privado o se
  quieren previews por PR → Netlify/Vercel.

---

## 3. Modelo de datos

`data/players.json` — una fila por jugador (fechas ISO; ejemplos a validar contra el Sheet):

```json
[
  {
    "id": "caps",
    "name": "Caps",
    "realName": "Rasmus Winther",
    "teamId": "g2",
    "role": "mid",
    "isCoach": false,
    "nationality": "DK",
    "contractEnd": "2027-11-16",
    "contractStatus": "active",
    "agentId": "op-player",
    "photo": "assets/players/caps.webp",
    "teamHistory": [{ "team": "Fnatic", "years": "2018–2019" }],
    "sourceUrl": "https://lol.fandom.com/wiki/Caps",
    "notes": ""
  }
]
```

- `role`: `top | jungle | mid | adc | support | coach` · `contractStatus`:
  `active | free_agent | unknown | retired`.
- **Regla derivada (nunca se escribe en el JSON)**:
  `terminaEn2026 = contractStatus === "active" && contractEnd?.slice(0,4) === "2026"`.
  La fecha textual "Day After Worlds 2026" se resuelve en overrides a
  `{ display: "Post-Worlds 2026", contractEnd: "2026-11-16" }` (estimado con nota).
- `data/teams.json`: `{ id, name, slug, abbreviation, logo }` — lista canónica sacada del
  Sheet (⚠️ incluye NaVi y Shifters en 2026).
- `data/agents.json` (generado desde overrides): `{ id, name, type: "agent"|"agency",
  website, playerIds[] }`. El filtro de agente se ordena por nº de clientes desc.
- **Futuro (M4), sin reescribir**: `data/moves.json` → `{ playerId, fromTeamId, toTeamId,
  status: "rumor"|"confirmed"|"done", sourceUrl, date }`; vista "Rosters 2027" = selector de
  temporada que aplica los moves sobre los rosters actuales.

---

## 4. Lógica de filtros e interacciones

Los filtros se combinan con **AND**: `{ team, role, agent, onlyExpiring2026, query }` +
barra de chips activos removibles + contador "X de N jugadores".

| Filtro | Comportamiento |
|---|---|
| Equipo | select único; la parrilla muestra solo ese equipo |
| Rol | chips single-select; coaches ocultos salvo selección explícita "Coach" |
| **Agente** | **resaltar en parrilla / aislar en tabla**. En parrilla se conservan los 10 equipos: clientes con borde azul, resto a opacity 0.35, cabecera "2/5 representados" (mantiene el mapa de equipos → se ve la dispersión del agente). En tabla (lista plana) se aísla |
| Solo 2026 | toggle → `terminaEn2026`; equipos sin coincidencias se ocultan |
| Búsqueda | debounce 200 ms, ≥2 chars, sobre `name` + `realName`; aísla |

**Vista tabla**: orden por defecto `contractEnd` ascendente (unknown/free agents al final) →
se ve el calendario de la offseason de un vistazo. Columnas: jugador, equipo, rol, fin de
contrato, estado, agente, nacionalidad. Cabeceras clicables asc/desc.

**Ficha de jugador** (drawer lateral; pantalla completa en móvil): foto, nombre/realName,
bandera, equipo+logo, rol, fecha + badge, agente con enlace, `teamHistory` (GCD) y
"Ver en GCD".

---

## 5. Milestones

### M1 — MVP: datos + parrilla con badges (S–M)
Scaffold Vite+React+TS+Tailwind; `tokens.css` con las dos guías; `fetch-sheet.mjs` +
`build-data.mjs` + `overrides.json` inicial; `download-assets.mjs` (logos + primeras fotos);
`TeamGrid/TeamCard/PlayerCard/ContractBadge/RoleIcon`; regla `terminaEn2026`.
- [ ] La parrilla renderiza los 10 equipos del Sheet con sus titulares (foto/rol/nombre).
- [ ] Toda tarjeta muestra exactamente uno de los 4 estados de contrato (verificado con 3 fixtures).
- [ ] Los 10 logos cargan; jugador sin foto → avatar de iniciales sin romper layout.
- [ ] Dark mode fiel a `bmw-m-DESIGN.md` (canvas #000, tarjetas #1a1a1a, esquinas rectas).
- [ ] `npm run build` sin errores de TS; script de validación de esquema (ids únicos, FKs válidas).

### M2 — Filtros, buscador y tabla (M)
`FilterBar` (5 filtros AND + chips activos + contador); resaltado por agente en parrilla;
`PlayerTable` ordenable; `EmptyState`; filtros en URL.
- [ ] Filtro de agente mantiene los 10 equipos y atenúa al 0.35; contador por equipo correcto.
- [ ] Combinación de filtros AND correcta en 3 casos de prueba manuales.
- [ ] "Solo 2026" oculta equipos sin coincidencias; buscador encuentra "Caps" con "cap".
- [ ] Tabla ordenada por fin de contrato asc por defecto; cabeceras alternan asc/desc.
- [ ] Los filtros sobreviven a un refresco (URL).

### M3 — Ficha de jugador, histórico GCD, temas y responsive (M)
`PlayerDrawer` + timeline; `teamHistory` manual para ~15 jugadores clave; toggle dark/light
fiel a `dmw-DESIGN.md`; responsive 375px; accesibilidad (foco, ESC, aria, teclado).
- [ ] Ficha abre/cierra con clic, ESC y clic fuera, con todos los campos.
- [ ] ≥15 jugadores con histórico verificado.
- [ ] Sin scroll horizontal a 375px; recorrido completo por teclado.
- [ ] Ambos temas solo con tokens documentados.

### M4 — Futuro: rosters 2027 y rumores (L)
`data/moves.json`; vista conmutadora "2026 / Proyección 2027"; rumores con borde punteado y
fuente; los que expiran en 2026 son los candidatos naturales.
- [ ] Un move `confirmed` reubica al jugador en 2027 conservando su ficha.
- [ ] `moves.json` vacío no afecta a M1–M3.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| CORS / fuentes en vivo | El navegador solo consume JSON local; toda descarga en scripts Node |
| Rate limit de Fandom | Solo `rest.php` (no `api.php`); pausas 2–3 s; assets commiteados |
| CSV sucio (roles, relleno, textuales) | Mapas de normalización + lista canónica de 10 + warnings de build (nada se descarta en silencio) |
| Badge 2026 poco discriminante (todos vencen 16-nov) | Jerarquía por fecha en tabla + fecha exacta visible; considerar tono secundario si >80% de la liga queda resaltada |
| Pérdida de datos manuales al refrescar | `overrides.json` separado que el generador nunca escribe + avisos de huérfanos |
| Cambios de nombre/equipo | Match por slug + alias en overrides; filtro `League === "LEC"` explícito |
| Logos de NaVi/Shifters | Verificar ficheros `<Equipo>logo std.png` en Fandom al montar `teams.json` |

---

## 7. Decisiones abiertas (bloquean poco, pero conviene cerrarlas)

1. **Filtro de agente**: propuesta = resaltar en parrilla + aislar en tabla. ¿OK, o aislar siempre?
2. **Coaches**: propuesta = en el JSON desde M1 pero ocultos salvo filtro "Coach".
3. **Salario estimado** (columna extra del Sheet si existiera / notas): guardar pero no mostrar en MVP.
4. **Idioma UI**: propuesta = ES por defecto con diccionario centralizado (EN a futuro).
5. **Repo público o privado** (condiciona GitHub Pages vs Netlify) y **cadencia del refresh automático** (semanal sugerida).
6. **Roles SVG**: CommunityDragon (oficial, estable) vs Sheepesports vía Wayback (estética exacta pero frágil y sin licencia). Propuesta: CommunityDragon.
