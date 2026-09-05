/**
 * Resuelve una ruta de asset almacenada en data/*.json ("assets/players/x.png")
 * contra la base de Vite: '/' en dev, './' en build (GitHub Pages / subruta).
 * Los assets se commitean en public/assets, así que nunca hay URL externa en runtime.
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.replace(/^\.\//, '').replace(/^\//, '');
  return base.endsWith('/') ? `${base}${normalized}` : `${base}/${normalized}`;
}
