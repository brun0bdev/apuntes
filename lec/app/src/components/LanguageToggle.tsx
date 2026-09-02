import { useI18n } from '../i18n';

/** Conmutador de idioma ES/EN: muestra el idioma al que se cambiaría. */
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  const next: 'en' | 'es' = lang === 'es' ? 'en' : 'es';

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={t('common.langToggleAria')}
      title={t('common.langToggleAria')}
      className="flex h-12 items-center justify-center rounded-full border border-hairline bg-card px-3 text-label-uppercase font-bold uppercase text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-accent"
    >
      {next === 'en' ? t('lang.toEn') : t('lang.toEs')}
    </button>
  );
}
