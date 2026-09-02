import { assetUrl } from '../lib/assets';
import type { Role } from '../types/player';
import { useI18n } from '../i18n';

interface RoleIconProps {
  role: Role;
  /** Tamaño en px (20 por defecto según PLAN.md). */
  size?: number;
  className?: string;
}

/** Icono de posición (repo webBrunoB, commiteado en public/assets/roles). */
export function RoleIcon({ role, size = 20, className = '' }: RoleIconProps) {
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
      className={`role-icon shrink-0 ${className}`}
    />
  );
}
