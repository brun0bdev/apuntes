let simulatorState = {
    matches: [],
    teams: {},
    h2h: {}
};

/**
 * Inicializa el simulador
 */
function initSimulator() {
    // Cargar estado guardado o usar valores iniciales
    loadSimulatorState();
    
    // Renderizar UI
    renderMatches();
    updateSimulation();
    
    // Event listeners
    document.getElementById('reset-btn').addEventListener('click', resetSimulation);
    document.getElementById('random-btn').addEventListener('click', randomizeResults);
}

/**
 * Carga el estado del simulador desde localStorage
 */
function loadSimulatorState() {
    const saved = localStorage.getItem('lecVersus2026_simulator');
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            simulatorState.matches = parsed.matches || cloneMatches();
        } catch (e) {
            simulatorState.matches = cloneMatches();
        }
    } else {
        simulatorState.matches = cloneMatches();
    }
    
    simulatorState.teams = cloneTeams();
    simulatorState.h2h = cloneH2H();
}

/**
 * Guarda el estado del simulador en localStorage
 */
function saveSimulatorState() {
    localStorage.setItem('lecVersus2026_simulator', JSON.stringify({
        matches: simulatorState.matches
    }));
}

/**
 * Renderiza los partidos en el simulador
 */
function renderMatches() {
    const saturdayContainer = document.getElementById('saturday-matches');
    const sundayContainer = document.getElementById('sunday-matches');
    
    saturdayContainer.innerHTML = '';
    sundayContainer.innerHTML = '';
    
    for (const match of simulatorState.matches) {
        const card = createMatchCard(match);
        
        if (match.day === 'saturday') {
            saturdayContainer.appendChild(card);
        } else {
            sundayContainer.appendChild(card);
        }
    }
}

/**
 * Crea una tarjeta de partido
 */
function createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.dataset.matchId = match.id;
    
    const team1 = TEAMS[match.team1];
    const team2 = TEAMS[match.team2];
    
    const team1Class = match.winner === match.team1 ? 'selected' : (match.winner === match.team2 ? 'loser' : '');
    const team2Class = match.winner === match.team2 ? 'selected' : (match.winner === match.team1 ? 'loser' : '');
    
    card.innerHTML = `
        <div class="match-time">🕐 ${match.time}</div>
        <div class="match-teams">
            <div class="match-team ${team1Class}" data-team="${match.team1}">
                <img src="${team1.logo}" alt="${team1.name}" class="team-logo">
                <span class="team-full">${team1.name}</span>
            </div>
            <span class="match-vs">VS</span>
            <div class="match-team ${team2Class}" data-team="${match.team2}">
                <img src="${team2.logo}" alt="${team2.name}" class="team-logo">
                <span class="team-full">${team2.name}</span>
            </div>
        </div>
    `;
    
    // Event listeners para seleccionar ganador
    const team1Btn = card.querySelector(`[data-team="${match.team1}"]`);
    const team2Btn = card.querySelector(`[data-team="${match.team2}"]`);
    
    team1Btn.addEventListener('click', () => selectWinner(match.id, match.team1));
    team2Btn.addEventListener('click', () => selectWinner(match.id, match.team2));
    
    return card;
}

/**
 * Selecciona el ganador de un partido
 */
function selectWinner(matchId, winnerId) {
    const match = simulatorState.matches.find(m => m.id === matchId);
    
    if (!match) return;
    
    // Si ya estaba seleccionado este ganador, deseleccionar
    if (match.winner === winnerId) {
        match.winner = null;
    } else {
        match.winner = winnerId;
    }
    
    saveSimulatorState();
    renderMatches();
    updateSimulation();
}

/**
 * Actualiza toda la simulación
 */
function updateSimulation() {
    // Recalcular equipos con resultados simulados
    const teams = cloneTeams();
    const h2h = cloneH2H();
    
    // Aplicar resultados seleccionados
    for (const match of simulatorState.matches) {
        if (match.winner) {
            const loserId = match.winner === match.team1 ? match.team2 : match.team1;
            applyMatchResult(teams, h2h, match.winner, loserId);
        }
    }
    
    // Calcular clasificación
    const standings = calculateStandings(teams, h2h);
    
    // Calcular probabilidades
    const probData = calculatePlayoffProbabilities(TEAMS, H2H, simulatorState.matches);
    
    // Actualizar UI
    renderStandings(standings, probData.probabilities);
    renderProbabilityBars(probData);
    updateStats(probData);
    
    // Actualizar escenarios si hay un equipo seleccionado
    const selectedTeam = document.getElementById('team-select').value;
    if (selectedTeam) {
        renderScenarios(selectedTeam);
    }
}

/**
 * Renderiza la tabla de clasificación
 */
function renderStandings(standings, probabilities) {
    const tbody = document.getElementById('standings-body');
    tbody.innerHTML = '';
    
    for (const team of standings) {
        const prob = probabilities[team.id];
        const probClass = getProbabilityClass(prob.probability);
        
        let rowClass = '';
        if (team.position <= 6) rowClass = 'qualified';
        else if (team.position <= 8) rowClass = 'bubble';
        else rowClass = 'eliminated';
        
        const teamData = TEAMS[team.id];
        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td><strong>${team.position}</strong></td>
            <td>
                <div class="team-info">
                    <img src="${teamData.logo}" alt="${team.name}" class="team-logo-sm">
                    <span class="team-name">
                        ${team.name}
                        <span class="team-abbr">${team.abbr}</span>
                    </span>
                </div>
            </td>
            <td>${team.wins}</td>
            <td>${team.losses}</td>
            <td>${(team.winPct * 100).toFixed(0)}%</td>
            <td>
                <div class="prob-bar">
                    <div class="prob-bar-bg">
                        <div class="prob-bar-fill ${probClass}" style="width: ${prob.probability}%"></div>
                    </div>
                    <span class="prob-value">${formatProbability(prob.probability)}</span>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    }
}

/**
 * Renderiza las barras de probabilidad
 */
function renderProbabilityBars(probData) {
    const container = document.getElementById('probability-bars');
    container.innerHTML = '';
    
    // Ordenar por probabilidad
    const sorted = Object.entries(probData.probabilities)
        .sort((a, b) => b[1].probability - a[1].probability);
    
    for (const [teamId, prob] of sorted) {
        const team = TEAMS[teamId];
        const probClass = getProbabilityClass(prob.probability);
        
        const row = document.createElement('div');
        row.className = 'prob-row';
        row.innerHTML = `
            <div class="team-info">
                <img src="${team.logo}" alt="${team.name}" class="team-logo-sm">
                <span class="team-name">${team.name}</span>
            </div>
            <div class="prob-bar-bg">
                <div class="prob-bar-fill ${probClass}" style="width: ${prob.probability}%"></div>
            </div>
            <span class="prob-value">${formatProbability(prob.probability)}</span>
        `;
        
        container.appendChild(row);
    }
}

/**
 * Actualiza las estadísticas
 */
function updateStats(probData) {
    document.getElementById('selected-matches').textContent = probData.decidedCount;
    document.getElementById('remaining-matches').textContent = 12 - probData.decidedCount;
    document.getElementById('possible-scenarios').textContent = probData.totalScenarios.toLocaleString();
}

/**
 * Reinicia la simulación
 */
function resetSimulation() {
    simulatorState.matches = cloneMatches();
    saveSimulatorState();
    renderMatches();
    updateSimulation();
}

/**
 * Genera resultados aleatorios
 */
function randomizeResults() {
    for (const match of simulatorState.matches) {
        match.winner = Math.random() < 0.5 ? match.team1 : match.team2;
    }
    
    saveSimulatorState();
    renderMatches();
    updateSimulation();
}

/**
 * Inicializa el selector de equipos para escenarios
 */
function initTeamSelector() {
    const select = document.getElementById('team-select');
    select.innerHTML = '<option value="">Selecciona un equipo...</option>';
    
    // Ordenar equipos alfabéticamente
    const sortedTeams = Object.values(TEAMS).sort((a, b) => a.name.localeCompare(b.name));
    
    for (const team of sortedTeams) {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        select.appendChild(option);
    }
    
    select.addEventListener('change', (e) => {
        if (e.target.value) {
            renderScenarios(e.target.value);
        }
    });
}

/**
 * Renderiza los escenarios para un equipo
 */
function renderScenarios(teamId) {
    const container = document.getElementById('scenarios-content');
    const scenario = analyzeTeamScenarios(teamId, TEAMS, H2H, simulatorState.matches);
    
    // Status badge
    let statusClass, statusIcon, statusText;
    if (scenario.status === 'qualified') {
        statusClass = 'qualified';
        statusIcon = '✅';
        statusText = 'Clasificado a Playoffs';
    } else if (scenario.status === 'eliminated') {
        statusClass = 'eliminated';
        statusIcon = '❌';
        statusText = 'Eliminado de Playoffs';
    } else {
        statusClass = 'contending';
        statusIcon = '⚡';
        statusText = `${formatProbability(scenario.currentProbability)} de clasificar`;
    }
    
    let html = `
        <div class="scenario-status ${statusClass}">
            ${statusIcon} ${statusText}
        </div>
        <div class="scenario-details">
    `;
    
    // Descripción general
    const description = generateScenarioDescription(scenario);
    if (description.length > 0) {
        html += `<h4>📋 Situación actual</h4><ul>`;
        for (const line of description) {
            html += `<li>${line}</li>`;
        }
        html += `</ul>`;
    }
    
    // Partidos del equipo
    if (scenario.teamMatches.length > 0) {
        html += `<h4>🎮 Sus partidos restantes</h4><ul>`;
        for (const match of scenario.teamMatches) {
            const opponent = match.team1 === teamId ? match.team2 : match.team1;
            const opponentTeam = TEAMS[opponent];
            const status = match.winner ? (match.winner === teamId ? '✅ Victoria' : '❌ Derrota') : '⏳ Por jugar';
            html += `<li>vs ${opponentTeam.name} - ${status}</li>`;
        }
        html += `</ul>`;
    }
    
    // Partidos importantes
    if (scenario.impactfulMatches.length > 0 && scenario.status === 'contending') {
        html += `<h4>🔥 Partidos clave para ${TEAMS[teamId].name}</h4><ul>`;
        for (const imp of scenario.impactfulMatches.slice(0, 5)) {
            const favorable = TEAMS[imp.favorable];
            const unfavorable = TEAMS[imp.unfavorable];
            const impactPct = imp.impact.toFixed(1);
            
            if (imp.match.team1 === teamId || imp.match.team2 === teamId) {
                html += `<li class="good">🎯 Ganar vs ${imp.match.team1 === teamId ? TEAMS[imp.match.team2].name : TEAMS[imp.match.team1].name} (+${impactPct}% prob.)</li>`;
            } else {
                html += `<li class="good">👍 Necesita que ${favorable.name} gane vs ${unfavorable.name} (+${impactPct}%)</li>`;
            }
        }
        html += `</ul>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}
