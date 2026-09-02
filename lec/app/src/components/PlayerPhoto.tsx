import { useEffect, useState } from 'react';
import { assetUrl } from '../lib/assets';
import { initialsOf } from '../lib/format';
import type { Player } from '../types/player';

interface PlayerPhotoProps {
  player: Player;
  /** Tamaño cuadrado en px (64 en tarjeta, 32 en tabla, 96 en ficha). */
  size: number;
  className?: string;
}

/**
 * Foto cuadrada del jugador con fallback de avatar de iniciales: si no hay
 * asset o la imagen falla (onError), se muestra un bloque bg-elevated con las
 * dos iniciales en text-muted; el tamaño de la fuente depende de la longitud.
 * Siempre decorativa (el nombre es visible al lado).
 */
export function PlayerPhoto({ player, size, className = '' }: PlayerPhotoProps) {
  const [failed, setFailed] = useState(false);

  // Al cambiar de jugador (reuso de la card en la parrilla) se reintenta la foto.
  useEffect(() => {
    setFailed(false);
  }, [player.id, player.photo]);

  if (!player.photo || failed) {
    const initials = initialsOf(player.name);
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: initials.length === 1 ? size * 0.44 : size * 0.34 }}
        className={`flex select-none items-center justify-center bg-elevated font-bold text-muted ${className}`}
      >
        {initials}
      </span>
    );
  }

  // Los importados de Leaguepedia traen URL absoluta (hotlink del CDN de Fandom);
  // el resto son rutas locales bajo public/.
  const src = player.photo && /^https?:\/\//i.test(player.photo) ? player.photo : assetUrl(player.photo);

  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
