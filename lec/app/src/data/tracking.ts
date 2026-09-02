import trackingJson from '../../data/tracking.json';
import type { TrackingFile } from '../types/tracking';

// Base persistente del tracking X: editable a mano o regenerada con el botón
// "Exportar JSON" de la vista Tracking.
export const trackingFile = trackingJson as TrackingFile;
