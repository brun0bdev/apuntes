import { assetUrl } from '../lib/assets';
import type { CSSProperties } from 'react';
import type { Role } from '../types/player';
import { useI18n } from '../i18n';

interface RoleIconProps {
  role: Role;
  /** Tamaño en px (20 por defecto según PLAN.md). */
  size?: number;
  className?: string;
  /** Estilos inline extra (p. ej. color para recolorear el icono). */
  style?: CSSProperties;
}

/** Icono de posición (repo webBrunoB, commiteado en public/assets/roles). */
export function RoleIcon({ role, size = 20, className = '', style }: RoleIconProps) {
  const { roleLabel } = useI18n();
  const label = roleLabel(role);
  return (
    <img
      src={assetUrl(`assets/roles/${role}.svg`)}
      width={size}
      height={size}
      alt={label}
      title={label}
      loading="lazy"
      style={style}
      className={`role-icon shrink-0 ${className}`}
    />
  );
}
