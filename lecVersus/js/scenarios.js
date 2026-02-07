/**
 * Analiza los escenarios de clasificación para un equipo específico
 * @param {string} teamId - ID del equipo a analizar
 * @param {Object} baseTeams - Estado actual de los equipos
 * @param {Object} baseH2H - Estado actual del H2H
 * @param {Array} matches - Partidos restantes
 * @returns {Object} Análisis detallado de escenarios
 */
function analyzeTeamScenarios(teamId, baseTeams, baseH2H, matches) {
    const undecidedMatches = matches.filter(m => m.winner === null);
    const decidedMatches = matches.filter(m => m.winner !== null);
    const numUndecided = undecidedMatches.length;
    const totalScenarios = Math.pow(2, numUndecided);
    
    let qualifyScenarios = 0;
    let eliminateScenarios = 0;
    
    // Escenarios clave
    const keyWins = {};
    const keyLosses = {}; 
    
    // Partidos donde participa el equipo
    const teamMatches = undecidedMatches.filter(m => m.team1 === teamId || m.team2 === teamId);
    const otherMatches = undecidedMatches.filter(m => m.team1 !== teamId && m.team2 !== teamId);
    
    // Análisis por resultado propio
    const scenariosByOwnRecord = {
        bestCase: { wins: teamMatches.length, qualifyCount: 0, totalCount: 0 },
        worstCase: { wins: 0, qualifyCount: 0, totalCount: 0 }
    };
    
    // Iterar escenarios
    for (let scenario = 0; scenario < totalScenarios; scenario++) {
        const teams = cloneTeams();
        const h2h = cloneH2H();
        
        // Aplicar partidos decididos
        for (const match of decidedMatches) {
            const loserId = match.winner === match.team1 ? match.team2 : match.team1;
            applyMatchResult(teams, h2h, match.winner, loserId);
        }
        
        // Contar victorias del equipo en este escenario
        let teamWins = 0;
        
        // Aplicar escenario
        for (let i = 0; i < numUndecided; i++) {
            const match = undecidedMatches[i];
            const winnerId = (scenario >> i) & 1 ? match.team2 : match.team1;
            const loserId = winnerId === match.team1 ? match.team2 : match.team1;
            applyMatchResult(teams, h2h, winnerId, loserId);
            
            if (winnerId === teamId) teamWins++;
        }
        
        // Calcular clasificación
        const standings = calculateStandings(teams, h2h);
        const position = standings.findIndex(t => t.id === teamId) + 1;
        const qualifies = position <= 8;
        
        if (qualifies) {
            qualifyScenarios++;
        } else {
            eliminateScenarios++;
        }
        
        // Tracking de mejor/peor caso
        if (teamWins === teamMatches.length) {
            scenariosByOwnRecord.bestCase.totalCount++;
            if (qualifies) scenariosByOwnRecord.bestCase.qualifyCount++;
        }
        if (teamWins === 0) {
            scenariosByOwnRecord.worstCase.totalCount++;
            if (qualifies) scenariosByOwnRecord.worstCase.qualifyCount++;
        }
        
        // Analizar impacto de cada partido
        for (let i = 0; i < numUndecided; i++) {
            const match = undecidedMatches[i];
            const winnerId = (scenario >> i) & 1 ? match.team2 : match.team1;
            
            if (!keyWins[match.id]) {
                keyWins[match.id] = { team1Wins: { qualify: 0, total: 0 }, team2Wins: { qualify: 0, total: 0 } };
            }
            
            if (winnerId === match.team1) {
                keyWins[match.id].team1Wins.total++;
                if (qualifies) keyWins[match.id].team1Wins.qualify++;
            } else {
                keyWins[match.id].team2Wins.total++;
                if (qualifies) keyWins[match.id].team2Wins.qualify++;
            }
        }
    }
    
    // Calcular qué partidos importan más
    const impactfulMatches = [];
    for (const match of undecidedMatches) {
        const data = keyWins[match.id];
        const team1QualifyPct = data.team1Wins.total > 0 ? (data.team1Wins.qualify / data.team1Wins.total) * 100 : 0;
        const team2QualifyPct = data.team2Wins.total > 0 ? (data.team2Wins.qualify / data.team2Wins.total) * 100 : 0;
        const impact = Math.abs(team1QualifyPct - team2QualifyPct);
        
        if (impact > 1) { 
            impactfulMatches.push({
                match,
                team1QualifyPct,
                team2QualifyPct,
                impact,
                favorable: team1QualifyPct > team2QualifyPct ? match.team1 : match.team2,
                unfavorable: team1QualifyPct > team2QualifyPct ? match.team2 : match.team1
            });
        }
    }
    
    // Ordenar por impacto
    impactfulMatches.sort((a, b) => b.impact - a.impact);
    
    // Determinar estado actual
    const currentProb = (qualifyScenarios / totalScenarios) * 100;
    let status;
    if (currentProb >= 99.9) {
        status = 'qualified';
    } else if (currentProb <= 0.1) {
        status = 'eliminated';
    } else {
        status = 'contending';
    }
    
    // Calcular mejor y peor caso
    const bestCaseProb = scenariosByOwnRecord.bestCase.totalCount > 0 
        ? (scenariosByOwnRecord.bestCase.qualifyCount / scenariosByOwnRecord.bestCase.totalCount) * 100 
        : 0;
    const worstCaseProb = scenariosByOwnRecord.worstCase.totalCount > 0 
        ? (scenariosByOwnRecord.worstCase.qualifyCount / scenariosByOwnRecord.worstCase.totalCount) * 100 
        : 0;
    
    return {
        teamId,
        team: baseTeams[teamId],
        status,
        currentProbability: currentProb,
        qualifyScenarios,
        eliminateScenarios,
        totalScenarios,
        teamMatches,
        bestCase: {
            winsNeeded: teamMatches.length,
            probability: bestCaseProb
        },
        worstCase: {
            winsNeeded: 0,
            probability: worstCaseProb
        },
        impactfulMatches: impactfulMatches.slice(0, 6),
        magicNumber: calculateMagicNumber(teamId, baseTeams, matches),
        eliminationNumber: calculateEliminationNumber(teamId, baseTeams, matches)
    };
}

/**
 * Calcula el "magic number" - victorias necesarias para asegurar clasificación
 */
function calculateMagicNumber(teamId, teams, matches) {
    const teamMatches = matches.filter(m => 
        (m.team1 === teamId || m.team2 === teamId) && m.winner === null
    );
    
    const team = teams[teamId];
    const currentWins = team.wins;
    
    // Calcular máximo de victorias posibles para el 9no lugar
    let maxNinthPlaceWins = 0;
    const sortedTeams = Object.values(teams).sort((a, b) => b.wins - a.wins);
    
    // El 9no equipo actual
    if (sortedTeams.length >= 9) {
        const ninthTeam = sortedTeams[8];
        const ninthMatches = matches.filter(m => 
            (m.team1 === ninthTeam.id || m.team2 === ninthTeam.id) && m.winner === null
        );
        maxNinthPlaceWins = ninthTeam.wins + ninthMatches.length;
    }
    
    // Magic number = victorias necesarias para superar al 9no
    const winsNeeded = Math.max(0, maxNinthPlaceWins - currentWins + 1);
    
    if (winsNeeded > teamMatches.length) {
        return null; // No puede asegurar con sus propios partidos
    }
    
    return winsNeeded;
}

/**
 * Calcula el "elimination number" - derrotas que garantizan eliminación
 */
function calculateEliminationNumber(teamId, teams, matches) {
    const teamMatches = matches.filter(m => 
        (m.team1 === teamId || m.team2 === teamId) && m.winner === null
    );
    
    const team = teams[teamId];
    const maxPossibleWins = team.wins + teamMatches.length;
    
    // Calcular mínimo de victorias del 8vo lugar
    const sortedTeams = Object.values(teams).sort((a, b) => b.wins - a.wins);
    
    if (sortedTeams.length >= 8) {
        const eighthTeam = sortedTeams[7];
        // Si incluso ganando todo no alcanzamos al 8vo actual, estamos en riesgo
        if (maxPossibleWins < eighthTeam.wins) {
            return 0; // Ya eliminado matemáticamente
        }
    }
    
    // Número de derrotas más que nos dejarían fuera
    const lossesAllowed = teamMatches.length - 1; // Simplificación
    return Math.max(0, lossesAllowed);
}

/**
 * Genera texto descriptivo del escenario
 */
function generateScenarioDescription(scenario) {
    const team = scenario.team;
    const lines = [];
    
    if (scenario.status === 'qualified') {
        lines.push(`${ICONS.checkCircle} ${t('scenarioDescQualified', team.name)}`);
    } else if (scenario.status === 'eliminated') {
        lines.push(`${ICONS.xCircle} ${t('scenarioDescEliminated', team.name)}`);
    } else {
        lines.push(t('scenarioDescProbability', team.name, formatProbability(scenario.currentProbability)));
        
        if (scenario.teamMatches.length > 0) {
            lines.push(t('scenarioDescRemainingMatches', scenario.teamMatches.length));
            
            if (scenario.bestCase.probability >= 99.9) {
                lines.push(t('scenarioDescWinAll'));
            } else if (scenario.bestCase.probability > 0) {
                lines.push(t('scenarioDescBestCase', formatProbability(scenario.bestCase.probability)));
            }
            
            if (scenario.worstCase.probability <= 0.1) {
                lines.push(`${ICONS.skull} ${t('scenarioDescLoseAll')}`);
            } else if (scenario.worstCase.probability < 100) {
                lines.push(t('scenarioDescWorstCase', formatProbability(scenario.worstCase.probability)));
            }
        }
    }
    
    return lines;
}
