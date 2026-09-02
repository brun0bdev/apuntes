import { ROLE_ORDER } from '../lib/roles';
import type { Role } from '../types/player';
import { FilterChip } from './FilterChip';
import { useI18n } from '../i18n';

interface RoleChipsProps {
  value: Role | '';
  onChange: (role: Role | '') => void;
}

const OPTIONS: ReadonlyArray<{ value: Role | '' }> = [
  { value: '' },
  ...ROLE_ORDER.map((role) => ({ value: role })),
];

/** Chips single-select de rol. Los coaches solo aparecen con selección explícita "Coach". */
export function RoleChips({ value, onChange }: RoleChipsProps) {
  const { t, roleLabel } = useI18n();

  return (
    <div role="group" aria-label={t('table.role')} className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((option) => (
        <FilterChip key={option.value || 'all'} active={value === option.value} onClick={() => onChange(option.value)}>
          {option.value === '' ? t('role.all') : roleLabel(option.value)}
        </FilterChip>
      ))}
    </div>
  );
}
