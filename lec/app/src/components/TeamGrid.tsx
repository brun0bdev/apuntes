import type { TeamGroup } from '../lib/filters';
import { TeamCard } from './TeamCard';

interface TeamGridProps {
  groups: TeamGroup[];
  agentActive: boolean;
  onSelect: (playerId: string) => void;
}

/**
 * Parrilla de equipos: 1 col móvil, 2 tablet, 3 laptop y en escritorio ancho
 * 5 columnas cuando son 10 equipos (LEC, dos filas de cinco) o 4 cuando son
 * 8 (LCS, dos filas de cuatro) — siempre caben de un vistazo.
 */
export function TeamGrid({ groups, agentActive, onSelect }: TeamGridProps) {
  // Con 8 equipos 4 columnas da dos filas parejas; cualquier otra cifra usa 5.
  const desktopCols = groups.length === 8 ? 'xl:grid-cols-4' : 'xl:grid-cols-5';

  return (
    <div data-export-root className={`mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${desktopCols}`}>
      {groups.map((group) => (
        <TeamCard key={group.team.id} group={group} agentActive={agentActive} onSelect={onSelect} />
      ))}
    </div>
  );
}
