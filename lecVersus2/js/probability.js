/**
 * Calcula las probabilidades de playoff para todos los equipos
 * Itera sobre todas las 2^n combinaciones posibles de resultados
 * @param {Object} baseTeams - Estado actual de los equipos
 * @param {Object} baseH2H - Estado actual del H2H
 * @param {Array} matches - Partidos (con algunos ya decididos si el usuario los seleccionó)
 * @returns {Object} Probabilidades por equipo y estadísticas
 */
function calculatePlayoffProbabilities(baseTeams, baseH2H, matches) {
    // Encontrar partidos no decididos
    const undecidedMatches = matches.filter(m => m.winner === null);
    const decidedMatches = matches.filter(m => m.winner !== null);
    
    const numUndecided = undecidedMatches.length;
    const totalScenarios = Math.pow(2, numUndecided);
    
    // Contadores de clasificación por equipo
    const qualifyCount = {};
    for (const teamId of Object.keys(baseTeams)) {
        qualifyCount[teamId] = 0;
    }
    
    // Iterar sobre todas las combinaciones posibles
    for (let scenario = 0; scenario < totalScenarios; scenario++) {
        const teams = cloneTeams();
        const h2h = cloneH2H();
        
        // Aplicar partidos ya decididos
        for (const match of decidedMatches) {
            const loserId = match.winner === match.team1 ? match.team2 : match.team1;
            applyMatchResult(teams, h2h, match.winner, loserId);
        }
        
        // Aplicar este escenario específico para partidos no decididos
        for (let i = 0; i < numUndecided; i++) {
            const match = undecidedMatches[i];
            const winnerId = (scenario >> i) & 1 ? match.team2 : match.team1;
            const loserId = winnerId === match.team1 ? match.team2 : match.team1;
            applyMatchResult(teams, h2h, winnerId, loserId);
        }
        
        // Calcular clasificación para este escenario
        const standings = calculateStandings(teams, h2h);
        
        // Contar quién clasifica (top 8)
        for (let pos = 0; pos < 8; pos++) {
            qualifyCount[standings[pos].id]++;
        }
    }
    
    // Calcular probabilidades
    const probabilities = {};
    for (const [teamId, count] of Object.entries(qualifyCount)) {
        probabilities[teamId] = {
            count: count,
            total: totalScenarios,
            probability: (count / totalScenarios) * 100
        };
    }
    
    return {
        probabilities,
        totalScenarios,
        undecidedCount: numUndecided,
        decidedCount: decidedMatches.length
    };
}

/**
 * Calcula las probabilidades actuales (sin simulación)
 */
function calculateCurrentProbabilities() {
    const matches = cloneMatches();
    return calculatePlayoffProbabilities(TEAMS, H2H, matches);
}

/**
 * Obtiene el color de la barra de probabilidad según el valor
 */
function getProbabilityClass(prob) {
    if (prob >= 70) return 'high';
    if (prob >= 30) return 'medium';
    return 'low';
}

/**
 * Formatea la probabilidad para mostrar
 */
function formatProbability(prob) {
    if (prob >= 99.9) return '100%';
    if (prob <= 0.1) return '0%';
    return prob.toFixed(1) + '%';
}
