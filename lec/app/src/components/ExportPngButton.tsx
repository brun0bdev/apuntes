import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import {
  BRAND_NAME,
  exportViewAsPng,
  formatExportDate,
  pageUrl,
  type ExportFrameConfig,
} from '../lib/exportImage';

interface ExportPngButtonProps {
  /** Textos del marco (título de la vista, contador y chips de filtros activos). */
  config: Omit<ExportFrameConfig, 'footerLeft' | 'footerRight'>;
  /** Nombre del fichero descargado (sin extensión). */
  filename: string;
  /** sm = fila de filtros de Inicio (h-7); md = cabecera de las vistas 2027 (h-9). */
  size?: 'sm' | 'md';
}

/**
 * Botón "Exportar PNG": captura la zona [data-export-root] de la vista activa,
 * la compone en un marco con cabecera de marca y descarga el PNG. Mientras
 * genera muestra "Generando…"; si falla, avisa en rojo unos segundos.
 */
export function ExportPngButton({ config, filename, size = 'sm' }: ExportPngButtonProps) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const run = () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    void exportViewAsPng(
      {
        ...config,
        footerLeft: `${BRAND_NAME} · ${t('footer.madeBy', { name: 'BrunoB' })}`,
        footerRight: `${pageUrl()} · ${formatExportDate(lang)}`,
      },
      filename,
    )
      .then(() => setBusy(false))
      .catch((err) => {
        console.error('export PNG:', err);
        setBusy(false);
        setFailed(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setFailed(false), 2500);
      });
  };

  const classes =
    size === 'md'
      ? 'h-9 border border-hairline bg-card px-3 text-caption font-bold uppercase text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent'
      : 'h-7 border border-hairline bg-card px-2.5 text-caption font-bold uppercase text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent';

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      aria-label={t('export.pngAria')}
      className={`${classes} ${failed ? 'text-danger' : ''}`}
    >
      {failed ? t('export.pngError') : busy ? t('export.pngBusy') : t('export.png')}
    </button>
  );
}
