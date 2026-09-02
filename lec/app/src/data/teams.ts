import teamsJson from '../../data/teams.json';
import type { Team } from '../types/player';

// El JSON lo genera scripts/build-data.mjs; el cast aplica el esquema de PLAN.md §3
// y hace que cualquier desviación del esquema falle en `tsc --noEmit`.
export const teams = teamsJson as Team[];
