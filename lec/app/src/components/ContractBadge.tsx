import type { ContractState } from '../lib/contract';
import { useI18n } from '../i18n';

interface ContractBadgeProps {
  state: ContractState;
  /** Variante compacta para celdas de tabla. */
  compact?: boolean;
  className?: string;
}

/**
 * Indicador de contrato según el diseño de referencia: el único caso con chip
 * propio es "expira 2026" — romboide rojo con el año, pensado para ir junto a
 * la fecha (que se pinta en rojo desde la tarjeta). Los contratos largos no
 * llevan chip (la fecha en gris basta); agente libre y desconocido sí.
 */
export function ContractBadge({ state, compact = false, className = '' }: ContractBadgeProps) {
  const { t } = useI18n();
  const chipSize = compact ? 'px-1.5 py-0.5 text-caption' : 'px-2 py-0.5 text-label-uppercase';

  switch (state) {
    case 'expiring2026':
      return (
        <span
          className={`inline-flex -skew-x-6 items-center whitespace-nowrap bg-m-red font-bold uppercase italic text-on-dark ${chipSize} ${className}`}
        >
          {t('contract.2026')}
        </span>
      );
    case 'free_agent':
      return (
        <span
          className={`inline-flex -skew-x-6 items-center whitespace-nowrap bg-danger font-bold uppercase text-on-dark ${chipSize} ${className}`}
        >
          {t('contract.freeAgent')}
        </span>
      );
    case 'long':
      return null;
    case 'retired':
      return (
        <span
          className={`inline-flex items-center whitespace-nowrap border border-hairline bg-elevated font-bold uppercase text-muted ${chipSize} ${className}`}
        >
          {t('contract.retired')}
        </span>
      );
    case 'unknown':
      return (
        <span
          className={`inline-flex items-center justify-center whitespace-nowrap border border-hairline bg-elevated font-bold text-muted ${compact ? 'h-5 w-5 text-caption' : 'h-6 w-6 text-body-sm'} ${className}`}
          title={t('contract.unknownTitle')}
        >
          ?
        </span>
      );
  }
}
