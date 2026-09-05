import type { Role } from '../types/player';

/**
 * Orden canónico de los roles (usado por chips, ordenación de la tabla y la
 * vista 2027). Las etiquetas visibles viven en el i18n (role.*) porque cambian
 * con el idioma (Jungla/Jungle).
 */
export const ROLE_ORDER: ReadonlyArray<Role> = ['top', 'jungle', 'mid', 'adc', 'support', 'coach'];
