import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

interface CopyLinkButtonProps {
  /** Vista a la que apunta el enlace (`view=` en la URL). */
  view: 'roster2027' | 'staff2027';
  /** Valor del parámetro `proj` ('' = sin asignaciones compartibles). */
  proj: string;
}

/**
 * Copia al portapapeles un enlace compartible de la proyección 2027
 * (`?view=<view>&proj=<assignments>`). La URL se construye sin `?proj=` cuando
 * no hay nada que compartir, para no arrastrar un parámetro vacío.
 */
export function CopyLinkButton({ view, proj }: CopyLinkButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const copy = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=${view}${
      proj ? `&proj=${encodeURIComponent(proj)}` : ''
    }`;
    navigator.clipboard.writeText(url).catch(() => {
      // sin portapapeles (permiso denegado, contexto no seguro): feedback ninguno
    });
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="h-9 border border-hairline bg-card px-3 text-caption font-bold uppercase text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent"
    >
      {copied ? t('r27.copyLinkCopied') : t('r27.copyLink')}
    </button>
  );
}
