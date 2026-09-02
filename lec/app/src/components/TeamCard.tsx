import { useState } from 'react';
import { assetUrl } from '../lib/assets';
import type { Team } from '../types/player';
import type { TeamGroup } from '../lib/filters';
import { PlayerCard } from './PlayerCard';

interface TeamCardProps {
  group: TeamGroup;
  /** Filtro de agente activo: los no clientes se atenúan. */
  agentActive: boolean;
  onSelect: (playerId: string) => void;
}

/** Logotipo suelto (sin baldosa), al estilo "título"; fallback a la abreviatura. */
function TeamLogo({ team }: { team: Team }) {
  const [failed, setFailed] = useState(false);

  if (!team.logo || failed) {
    return <span className="text-body-sm font-bold uppercase text-muted">{team.abbreviation}</span>;
  }
  return (
    <img
      src={assetUrl(team.logo)}
      alt=""
      width={60}
      height={60}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 object-contain"
    />
  );
}

/**
 * Cabecera de equipo "Idea 2 — subrayado de título": bloque neutro con el
 * logo suelto y el nombre grande, separado de las tarjetas de jugador por
 * una línea gruesa del color de marca. Con el filtro de agente activo el
 * equipo nunca se oculta: clientes resaltados y resto atenuado (PLAN.md §4).
 */
export function TeamCard({ group, agentActive, onSelect }: TeamCardProps) {
  const { team, players, highlightedIds } = group;

  return (
    <section aria-labelledby={`team-heading-${team.id}`} className="flex flex-col gap-2">
      <div className="border border-hairline bg-card">
        <header className="flex items-center gap-3 px-3 py-2.5">
          <TeamLogo team={team} />
          <h2 id={`team-heading-${team.id}`} className="min-w-0 truncate text-title-md font-bold uppercase text-ink">
            {team.name}
          </h2>
        </header>
        <div className="h-1" style={{ background: team.color }} aria-hidden="true" />
      </div>
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          highlighted={agentActive && highlightedIds.has(player.id)}
          dimmed={agentActive && !highlightedIds.has(player.id)}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}
