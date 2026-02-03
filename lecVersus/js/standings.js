/**
 * Calcula la clasificación de los equipos con desempates
 * @param {Object} teams - Objeto con los equipos y sus records
 * @param {Object} h2h - Matriz de head-to-head
 * @returns {Array} Array de equipos ordenados por clasificación
 */
function calculateStandings(teams, h2h) {
    // Convertir a array y ordenar por victorias (descendente)
    let standings = Object.values(teams).map(team => ({
        ...team,
        winPct: team.wins / (team.wins + team.losses)
    }));
    
    // Ordenar por victorias primero
    standings.sort((a, b) => b.wins - a.wins);
    
    // Agrupar equipos con el mismo número de victorias
    const groups = groupByWins(standings);
    
    // Resolver desempates dentro de cada grupo
    const resolved = [];
    for (const group of groups) {
        if (group.length === 1) {
            resolved.push(group[0]);
        } else if (group.length === 2) {
            // Desempate H2H para 2 equipos
            const sorted = resolveTwoWayTie(group, h2h);
            resolved.push(...sorted);
        } else {
            // Desempate por SoV para 3+ equipos
            const sorted = resolveMultiWayTie(group, h2h, teams);
            resolved.push(...sorted);
        }
    }
    
    // Asignar posiciones
    return resolved.map((team, index) => ({
        ...team,
        position: index + 1,
        qualified: index < 8,
        bubble: index >= 6 && index <= 9,
        eliminated: index >= 8
    }));
}

/**
 * Agrupa equipos por número de victorias
 */
function groupByWins(standings) {
    const groups = [];
    let currentGroup = [];
    let currentWins = null;
    
    for (const team of standings) {
        if (currentWins === null || team.wins === currentWins) {
            currentGroup.push(team);
            currentWins = team.wins;
        } else {
            groups.push(currentGroup);
            currentGroup = [team];
            currentWins = team.wins;
        }
    }
    
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    return groups;
}

/**
 * Resuelve empate entre 2 equipos usando H2H
 */
function resolveTwoWayTie(teams, h2h) {
    const [teamA, teamB] = teams;
    const record = h2h[teamA.id][teamB.id];
    
    if (record.wins > record.losses) {
        return [teamA, teamB];
    } else if (record.losses > record.wins) {
        return [teamB, teamA];
    } else {
        // H2H empatado, usar SoV
        const sovA = calculateSoV(teamA.id, h2h, Object.fromEntries(teams.map(t => [t.id, t])));
        const sovB = calculateSoV(teamB.id, h2h, Object.fromEntries(teams.map(t => [t.id, t])));
        
        if (sovA > sovB) {
            return [teamA, teamB];
        } else if (sovB > sovA) {
            return [teamB, teamA];
        }
        // Si aún está empatado, mantener orden alfabético
        return teams.sort((a, b) => a.name.localeCompare(b.name));
    }
}

/**
 * Resuelve empate entre 3+ equipos usando el proceso iterativo oficial de la LEC:
 * 1. Calcular H2H entre equipos empatados
 * 2. Si algún equipo se separa claramente (mejor o peor H2H), colocarlo y removerlo
 * 3. Reiniciar el proceso con los equipos restantes desde H2H
 * 4. Si H2H no separa a nadie, usar SoV
 * 5. Si SoV separa a algún equipo, colocarlo, removerlo y reiniciar desde H2H
 */
function resolveMultiWayTie(teams, h2h, allTeams) {
    // Caso base: 1 equipo o menos
    if (teams.length <= 1) {
        return teams;
    }
    
    // Caso base: 2 equipos - usar desempate directo H2H
    if (teams.length === 2) {
        return resolveTwoWayTie(teams, h2h);
    }
    
    // Paso 1: Calcular H2H dentro del grupo
    const h2hResults = calculateGroupH2H(teams, h2h);
    
    // Calcular win% de H2H para cada equipo
    const teamsWithH2H = teams.map(team => {
        const record = h2hResults[team.id];
        const totalGames = record.wins + record.losses;
        const winPct = totalGames > 0 ? record.wins / totalGames : 0.5;
        return { ...team, h2hWins: record.wins, h2hLosses: record.losses, h2hWinPct: winPct };
    });
    
    // Ordenar por H2H win%
    teamsWithH2H.sort((a, b) => b.h2hWinPct - a.h2hWinPct);
    
    // Verificar si algún equipo se separa claramente por H2H
    const h2hGroups = groupByMetric(teamsWithH2H, 'h2hWinPct');
    
    if (h2hGroups.length > 1) {
        // Algunos equipos se separaron por H2H
        const resolved = [];
        
        for (const group of h2hGroups) {
            if (group.length === 1) {
                // Equipo claramente separado
                resolved.push(group[0]);
            } else {
                // Subgrupo aún empatado - reiniciar proceso desde H2H con este subgrupo
                const subResolved = resolveMultiWayTie(group, h2h, allTeams);
                resolved.push(...subResolved);
            }
        }
        
        return resolved;
    }
    
    // Paso 2: H2H no separó a nadie, usar SoV
    const teamsWithSoV = teamsWithH2H.map(team => ({
        ...team,
        sov: calculateSoV(team.id, h2h, allTeams)
    }));
    
    // Ordenar por SoV
    teamsWithSoV.sort((a, b) => b.sov - a.sov);
    
    // Verificar si algún equipo se separa claramente por SoV
    const sovGroups = groupByMetric(teamsWithSoV, 'sov');
    
    if (sovGroups.length > 1) {
        // Algunos equipos se separaron por SoV
        const resolved = [];
        
        for (const group of sovGroups) {
            if (group.length === 1) {
                // Equipo claramente separado
                resolved.push(group[0]);
            } else {
                // Subgrupo aún empatado - REINICIAR desde H2H con este subgrupo
                const subResolved = resolveMultiWayTie(group, h2h, allTeams);
                resolved.push(...subResolved);
            }
        }
        
        return resolved;
    }
    
    // Si nada separa a los equipos, ordenar alfabéticamente como último recurso
    return teamsWithSoV.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Agrupa equipos por una métrica específica
 * Retorna grupos de equipos con el mismo valor de la métrica
 */
function groupByMetric(teams, metricKey) {
    if (teams.length === 0) return [];
    
    const groups = [];
    let currentGroup = [teams[0]];
    let currentValue = teams[0][metricKey];
    
    for (let i = 1; i < teams.length; i++) {
        const team = teams[i];
        // Usar tolerancia para comparar floats
        if (Math.abs(team[metricKey] - currentValue) < 0.0001) {
            currentGroup.push(team);
        } else {
            groups.push(currentGroup);
            currentGroup = [team];
            currentValue = team[metricKey];
        }
    }
    
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    return groups;
}

/**
 * Calcula el record H2H dentro de un grupo de equipos
 */
function calculateGroupH2H(teams, h2h) {
    const results = {};
    const teamIds = teams.map(t => t.id);
    
    for (const team of teams) {
        results[team.id] = { wins: 0, losses: 0 };
        
        for (const oppId of teamIds) {
            if (oppId !== team.id) {
                const record = h2h[team.id][oppId];
                results[team.id].wins += record.wins;
                results[team.id].losses += record.losses;
            }
        }
    }
    
    return results;
}

/**
 * Calcula el Strength of Victory (SoV) para un equipo
 * SoV = suma de las victorias de todos los equipos a los que has ganado
 */
function calculateSoV(teamId, h2h, allTeams) {
    let sov = 0;
    
    for (const [oppId, record] of Object.entries(h2h[teamId])) {
        if (record.wins > 0 && allTeams[oppId]) {
            sov += allTeams[oppId].wins * record.wins;
        }
    }
    
    return sov;
}

/**
 * Aplica un resultado de partido a los datos
 */
function applyMatchResult(teams, h2h, winnerId, loserId) {
    // Actualizar records
    teams[winnerId].wins++;
    teams[loserId].losses++;
    
    // Actualizar H2H
    h2h[winnerId][loserId].wins++;
    h2h[loserId][winnerId].losses++;
}

/**
 * Revierte un resultado de partido
 */
function revertMatchResult(teams, h2h, winnerId, loserId) {
    // Revertir records
    teams[winnerId].wins--;
    teams[loserId].losses--;
    
    // Revertir H2H
    h2h[winnerId][loserId].wins--;
    h2h[loserId][winnerId].losses--;
}
