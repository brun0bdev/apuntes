import { FilterChip } from './FilterChip';
import { useI18n } from '../i18n';

interface ExpiringToggleProps {
  active: boolean;
  onToggle: () => void;
}

/** Toggle "Solo terminan en 2026" con estilo de chip (aria-pressed). */
export function ExpiringToggle({ active, onToggle }: ExpiringToggleProps) {
  const { t } = useI18n();

  return (
    <FilterChip active={active} onClick={onToggle}>
      {t('filter.expiring')}
    </FilterChip>
  );
}
