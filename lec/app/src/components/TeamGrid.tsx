import type { TeamGroup } from '../lib/filters';
import { TeamCard } from './TeamCard';

interface TeamGridProps {
  groups: TeamGroup[];
  agentActive: boolean;
  onSelect: (playerId: string) => void;
}

/**
 * Parrilla de equipos en dos filas de cinco (1 col móvil, 2 tablet, 3 laptop
 * y 5 en escritorio ancho — los 10 equipos LEC caben de un vistazo).
 */
export function TeamGrid({ groups, agentActive, onSelect }: TeamGridProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {groups.map((group) => (
        <TeamCard key={group.team.id} group={group} agentActive={agentActive} onSelect={onSelect} />
      ))}
    </div>
  );
}
