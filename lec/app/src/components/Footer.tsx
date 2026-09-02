import { useI18n } from '../i18n';

/**
 * Pie con la atribución de fuentes (texto estático) y la nota de los datos
 * manuales (agentes, agencias, nacionalidad, histórico) que viven en
 * data/overrides.json, que los scripts generadores nunca escriben.
 */
export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-hairline bg-soft">
      <div className="mx-auto w-full max-w-content px-4 py-8">
        <p className="text-caption text-muted">{t('footer.sources')}</p>
        <p className="mt-2 text-caption text-muted-soft">{t('footer.manual')}</p>
      </div>
    </footer>
  );
}
