import agentsJson from '../../data/agents.json';
import type { Agent } from '../types/player';

// El JSON lo genera scripts/build-data.mjs desde overrides.json; puede ser un array vacío.
export const agents = agentsJson as Agent[];
