import { toPng } from 'html-to-image';

/**
 * Exportación a PNG de la vista activa (Inicio, Roster 2027, Staff 2027).
 *
 * Captura el DOM real (los mismos nodos que pinta el navegador, con los
 * filtros ya aplicados) vía html-to-image (SVG foreignObject: el propio motor
 * del navegador rasteriza, así que los tokens del tema y las clases de
 * Tailwind se respetan al píxel). El contenido se compone dentro de un marco
 * "enhanced" construido off-screen con los tokens del tema activo: firma
 * tricolor M arriba, una banda de título SOLO cuando la vista aporta un
 * título contextual (p. ej. "Junglers" con el filtro de rol activo; sin
 * filtros no hay cabecera) y un pie con marca, URL de la web y fecha.
 *
 * En el clon se eliminan los elementos marcados con `data-no-export`
 * (controles interactivos: inputs, botones de acción, paneles de búsqueda),
 * de modo que la imagen muestre el contenido pero no la UI de edición. La
 * zona capturada es la marcada con `data-export-root` (una por vista).
 */

/** Textos ya traducidos que la vista aporta para el marco. */
export interface ExportFrameConfig {
  /** Título contextual opcional ("Junglers", "Fnatic · Tops"); si falta, sin banda de cabecera. */
  title?: string;
  footerLeft: string;
  footerRight: string;
}

/** Nombre del producto, para el pie (no cambia con el idioma). */
export const BRAND_NAME = 'Scouting LEC 2026';

/** URL limpia de la web (sin query ni hash) para el pie de la imagen. */
export function pageUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

/** Fecha corta localizada para el pie ("05/09/2026"). */
export function formatExportDate(lang: 'es' | 'en'): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function frameHeaderHtml(config: ExportFrameConfig): string {
  if (!config.title) return '';
  return `
    <div style="background:var(--surface-card);border-bottom:1px solid var(--hairline);padding:10px 16px">
      <div style="font-size:20px;line-height:1.25;font-weight:700;text-transform:uppercase;color:var(--ink)">${escapeHtml(config.title)}</div>
    </div>`;
}

function frameFooterHtml(config: ExportFrameConfig): string {
  return `
    <div style="display:flex;justify-content:space-between;gap:12px;background:var(--surface-soft);border-top:1px solid var(--hairline);padding:10px 16px;font-size:12px;line-height:1.4;color:var(--muted)">
      <span>${escapeHtml(config.footerLeft)}</span>
      <span>${escapeHtml(config.footerRight)}</span>
    </div>`;
}

/** dataURL PNG → Blob y descarga vía <a download> (blob evita límites de Safari con data:). */
function downloadPng(dataUrl: string, filename: string): void {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Sello de tiempo local para que cada PNG tenga nombre único ("2026-09-05_14-32-07"). */
function timestampSuffix(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

/** Nombre final del fichero: base + hora local + extensión. */
export function buildExportFilename(base: string): string {
  const stem = base.replace(/\.png$/i, '');
  return `${stem}-${timestampSuffix()}.png`;
}

export async function exportViewAsPng(config: ExportFrameConfig, filename: string): Promise<void> {
  const source = document.querySelector<HTMLElement>('[data-export-root]');
  if (!source) throw new Error('exportViewAsPng: la vista activa no define [data-export-root]');

  // Fuentes listas antes de capturar (si no, la imagen sale con la fallback).
  await document.fonts.ready;

  const width = Math.ceil(source.getBoundingClientRect().width);
  // holder posicionado off-screen; el frame capturado queda estático dentro
  // (html-to-image rasteriza el nodo raíz tal cual, sin su position).
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;top:0;left:-100000px;z-index:-1;';
  const frame = document.createElement('div');
  frame.style.cssText = `width:${width}px;background:var(--canvas);border:1px solid var(--hairline);color:var(--ink);`;
  frame.innerHTML = `
    <div class="m-stripe"></div>
    ${frameHeaderHtml(config)}
    <div data-export-content style="background:var(--canvas);padding:16px"></div>
    ${frameFooterHtml(config)}
  `;
  holder.appendChild(frame);
  document.body.appendChild(holder);

  try {
    const content = frame.querySelector<HTMLElement>('[data-export-content]')!;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-no-export]').forEach((node) => node.remove());
    // El marco ya da el aire superior: el primer margen del contenido (mt-4/mt-6
    // pensados para la web) se anula para no duplicarlo dentro del padding.
    clone.style.marginTop = '0';
    const firstChild = clone.firstElementChild as HTMLElement | null;
    if (firstChild) firstChild.style.marginTop = '0';
    content.appendChild(clone);

    const backgroundColor = getComputedStyle(frame).backgroundColor;
    const dataUrl = await toPng(frame, { pixelRatio: 2, backgroundColor });
    downloadPng(dataUrl, buildExportFilename(filename));
  } finally {
    holder.remove();
  }
}
