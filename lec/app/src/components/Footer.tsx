import { useI18n } from '../i18n';

/** Pie minimalista: firma con hipervínculo a brunob.dev. */
export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-hairline bg-soft">
      <div className="mx-auto w-full max-w-content px-4 py-6">
        <p className="text-caption text-muted">
          <a
            href="https://brunob.dev"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-body hover:text-ink hover:underline hover:decoration-accent hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('footer.madeBy', { name: 'BrunoB' })}
          </a>
        </p>
      </div>
    </footer>
  );
}
