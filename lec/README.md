# Scouting LEC 2026

Dashboard de rosters LEC con estado de contratos (foco offseason 2026), filtro por
agente, roster proyectado 2027 editable (drag & drop) y tracking de señales en X
(follows/unfollows de cuentas de jugadores, coaches, GMs y agencias).

- **App compilada**: esta carpeta se sirve como estática — `index.html` + `assets/`
  son el build (Vite, base relativa, funciona desde cualquier subruta).
- **Código fuente**: `app/` (Vite + React + TypeScript + Tailwind 4).
  `cd app && npm install && npm run build` y copiar `app/dist/index.html` y
  `app/dist/assets/` aquí para actualizar el build.
- **Datos**: `app/data/*.json` (players/teams/agents generados del Google Sheet;
  overrides.json editable a mano; projections.json y tracking.json desde la app).
- **Idioma** ES/EN (toggle en la cabecera), tema claro/oscuro, responsive.
- El prototipo anterior (`script.js`, `style.css`) fue sustituido; queda en el
  historial de git. `img/roles` y `transfers_2026_winter.csv` se conservan.
