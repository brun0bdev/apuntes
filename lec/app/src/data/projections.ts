import projectionsJson from '../../data/projections.json';
import type { ProjectionsFile } from '../types/player';

// Base persistente del roster proyectado 2027 (PLAN.md M4): editable a mano o
// regenerada con el botón "Exportar JSON" de la vista 2027.
export const projectionsFile = projectionsJson as ProjectionsFile;
