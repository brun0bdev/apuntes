/**
 * LEC Versus 2026 — Simulator Module
 * Handles match simulation, standings rendering, probability display, and progress tracking
 */

let simulatorState = {
    matches: [],
    teams: {},
    h2h: {}
};

// ========== Initialization ==========
function initSimulator() {
    loadSimulatorState();
    renderMatches();
    updateSimulation();

    document.getElementById('reset-btn').addEventListener('click', resetSimulation);
    document.getElementById('random-btn').addEventListener('click', randomizeResults);
}

// ========== State Management ==========
function loadSimulatorState() {
    const saved = localStorage.getItem('lecVersus2026_simulator');

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Validate saved matches still match current data structure
            if (parsed.matches && parsed.matches.length === REMAINING_MATCHES.length) {
                simulatorState.matches = parsed.matches;
                // Forzar valores de partidos bloqueados (resultados oficiales)
                for (const originalMatch of REMAINING_MATCHES) {
                    if (originalMatch.locked) {
                        const savedMatch = simulatorState.matches.find(m => m.id === originalMatch.id);
                        if (savedMatch) {
                            savedMatch.winner = originalMatch.winner;
                        }
                    }
                }
            } else {
                simulatorState.matches = cloneMatches();
            }
        } catch (e) {
            simulatorState.matches = cloneMatches();
        }
    } else {
        simulatorState.matches = cloneMatches();
    }

    simulatorState.teams = cloneTeams();
    simulatorState.h2h = cloneH2H();
}

function saveSimulatorState() {
    localStorage.setItem('lecVersus2026_simulator', JSON.stringify({
        matches: simulatorState.matches
    }));
}

// ========== Match Rendering ==========
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

    // Update match counts
    updateMatchCounts();
}

function createMatchCard(match) {
    const originalMatch = REMAINING_MATCHES.find(m => m.id === match.id);
    const isLocked = originalMatch && originalMatch.locked;
    
    const card = document.createElement('div');
    card.className = 'match-card' + (match.winner ? ' decided' : '') + (isLocked ? ' locked' : '');
    card.dataset.matchId = match.id;

    const team1 = TEAMS[match.team1];
    const team2 = TEAMS[match.team2];

    const team1Class = match.winner === match.team1 ? 'selected' : (match.winner === match.team2 ? 'loser' : '');
    const team2Class = match.winner === match.team2 ? 'selected' : (match.winner === match.team1 ? 'loser' : '');

    card.innerHTML = `
        <div class="match-time">${ICONS.clock} ${match.time}</div>
        <div class="match-teams">
            <div class="match-team ${team1Class}" data-team="${match.team1}" role="button" tabindex="0" aria-label="Seleccionar ${team1.name} como ganador">
                <img src="${team1.logo}" alt="${team1.name}" class="team-logo" loading="lazy">
                <span class="team-full">${team1.name}</span>
                <span class="team-record">${team1.wins}V - ${team1.losses}D</span>
            </div>
            <span class="match-vs">VS</span>
            <div class="match-team ${team2Class}" data-team="${match.team2}" role="button" tabindex="0" aria-label="Seleccionar ${team2.name} como ganador">
                <img src="${team2.logo}" alt="${team2.name}" class="team-logo" loading="lazy">
                <span class="team-full">${team2.name}</span>
                <span class="team-record">${team2.wins}V - ${team2.losses}D</span>
            </div>
        </div>
    `;

    // Click handlers
    const team1Btn = card.querySelector(`[data-team="${match.team1}"]`);
    const team2Btn = card.querySelector(`[data-team="${match.team2}"]`);

    const handleSelect = (teamId) => () => selectWinner(match.id, teamId);

    team1Btn.addEventListener('click', handleSelect(match.team1));
    team2Btn.addEventListener('click', handleSelect(match.team2));

    // Keyboard accessibility
    team1Btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(match.team1)(); } });
    team2Btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(match.team2)(); } });

    return card;
}

// ========== Winner Selection ==========
function selectWinner(matchId, winnerId) {
    const match = simulatorState.matches.find(m => m.id === matchId);
    if (!match) return;

    // No permitir cambios en partidos bloqueados (resultados oficiales)
    const originalMatch = REMAINING_MATCHES.find(m => m.id === matchId);
    if (originalMatch && originalMatch.locked) return;

    // Toggle selection
    if (match.winner === winnerId) {
        match.winner = null;
    } else {
        match.winner = winnerId;
    }

    saveSimulatorState();
    renderMatches();
    updateSimulation();
}

// ========== Simulation Update ==========
function updateSimulation() {
    // Recalculate with simulated results
    const teams = cloneTeams();
    const h2h = cloneH2H();

    for (const match of simulatorState.matches) {
        if (match.winner) {
            const loserId = match.winner === match.team1 ? match.team2 : match.team1;
            applyMatchResult(teams, h2h, match.winner, loserId);
        }
    }

    const standings = calculateStandings(teams, h2h);
    const probData = calculatePlayoffProbabilities(TEAMS, H2H, simulatorState.matches);

    // Update all UI
    renderStandings(standings, probData.probabilities);
    renderProbabilityBars(probData);
    updateStats(probData);
    updateProgress();

    // Update scenarios if a team is selected
    const selectedTeam = document.getElementById('team-select').value;
    if (selectedTeam) {
        renderScenarios(selectedTeam);
    }
}

// ========== Standings Rendering ==========
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
                    <img src="${teamData.logo}" alt="${team.name}" class="team-logo-sm" loading="lazy">
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

// ========== Probability Bars ==========
function renderProbabilityBars(probData) {
    const container = document.getElementById('probability-bars');
    container.innerHTML = '';

    const sorted = Object.entries(probData.probabilities)
        .sort((a, b) => b[1].probability - a[1].probability);

    for (const [teamId, prob] of sorted) {
        const team = TEAMS[teamId];
        const probClass = getProbabilityClass(prob.probability);

        const row = document.createElement('div');
        row.className = 'prob-row';
        row.setAttribute('role', 'listitem');
        row.innerHTML = `
            <div class="team-info">
                <img src="${team.logo}" alt="${team.name}" class="team-logo-sm" loading="lazy">
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

// ========== Stats Update ==========
function updateStats(probData) {
    document.getElementById('selected-matches').textContent = probData.decidedCount;
    document.getElementById('remaining-matches').textContent = 12 - probData.decidedCount;
    document.getElementById('possible-scenarios').textContent = probData.totalScenarios.toLocaleString();
}

// ========== Progress Bar ==========
function updateProgress() {
    const decided = simulatorState.matches.filter(m => m.winner).length;
    const total = simulatorState.matches.length;
    const pct = (decided / total) * 100;

    const fill = document.getElementById('sim-progress-fill');
    const count = document.getElementById('sim-progress-count');

    if (fill) fill.style.width = pct + '%';
    if (count) count.textContent = `${decided} / ${total} partidos`;

    // Confetti when all matches decided
    if (decided === total) {
        showToast('¡Todos los partidos simulados!', 'success');
        launchConfetti();
    }
}

// ========== Match Counts ==========
function updateMatchCounts() {
    const satCount = simulatorState.matches.filter(m => m.day === 'saturday' && m.winner).length;
    const sunCount = simulatorState.matches.filter(m => m.day === 'sunday' && m.winner).length;

    const satEl = document.getElementById('saturday-count');
    const sunEl = document.getElementById('sunday-count');

    if (satEl) satEl.textContent = `${satCount}/6`;
    if (sunEl) sunEl.textContent = `${sunCount}/6`;
}

// ========== Reset ==========
function resetSimulation() {
    simulatorState.matches = cloneMatches();
    saveSimulatorState();
    renderMatches();
    updateSimulation();
    showToast('Simulación reiniciada', 'info', 2000);
}

// ========== Randomize ==========
function randomizeResults() {
    for (const match of simulatorState.matches) {
        // No cambiar partidos bloqueados (resultados oficiales)
        const originalMatch = REMAINING_MATCHES.find(m => m.id === match.id);
        if (originalMatch && originalMatch.locked) continue;
        
        match.winner = Math.random() < 0.5 ? match.team1 : match.team2;
    }

    saveSimulatorState();
    renderMatches();
    updateSimulation();
    showToast('Resultados aleatorios generados', 'info', 2000);
}

// ========== Team Selector ==========
function initTeamSelector() {
    const select = document.getElementById('team-select');
    select.innerHTML = '<option value="">Selecciona un equipo...</option>';

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

// ========== Scenarios Rendering ==========
function renderScenarios(teamId) {
    const container = document.getElementById('scenarios-content');
    const scenario = analyzeTeamScenarios(teamId, TEAMS, H2H, simulatorState.matches);

    let statusClass, statusIcon, statusText;
    if (scenario.status === 'qualified') {
        statusClass = 'qualified';
        statusIcon = ICONS.checkCircle;
        statusText = 'Clasificado a Playoffs';
    } else if (scenario.status === 'eliminated') {
        statusClass = 'eliminated';
        statusIcon = ICONS.xCircle;
        statusText = 'Eliminado de Playoffs';
    } else {
        statusClass = 'contending';
        statusIcon = ICONS.zap;
        statusText = `${formatProbability(scenario.currentProbability)} de clasificar`;
    }

    let html = `
        <div class="scenario-status ${statusClass}">
            ${statusIcon} ${statusText}
        </div>
        <div class="scenario-details">
    `;

    // Description
    const description = generateScenarioDescription(scenario);
    if (description.length > 0) {
        html += `<h4>${ICONS.clipboard} Situación actual</h4><ul>`;
        for (const line of description) {
            html += `<li>${line}</li>`;
        }
        html += `</ul>`;
    }

    // Team matches
    if (scenario.teamMatches.length > 0) {
        html += `<h4>${ICONS.gamepad} Sus partidos restantes</h4><ul>`;
        for (const match of scenario.teamMatches) {
            const opponent = match.team1 === teamId ? match.team2 : match.team1;
            const opponentTeam = TEAMS[opponent];
            const status = match.winner
                ? (match.winner === teamId ? `${ICONS.checkCircle} Victoria` : `${ICONS.xCircle} Derrota`)
                : `${ICONS.hourglass} Por jugar`;
            const liClass = match.winner === teamId ? 'good' : (match.winner && match.winner !== teamId ? 'bad' : '');
            html += `<li class="${liClass}">vs ${opponentTeam.name} (${opponentTeam.wins}V-${opponentTeam.losses}D) — ${status}</li>`;
        }
        html += `</ul>`;
    }

    // Key matches
    if (scenario.impactfulMatches.length > 0 && scenario.status === 'contending') {
        html += `<h4>${ICONS.fire} Partidos clave para ${TEAMS[teamId].name}</h4><ul>`;
        for (const imp of scenario.impactfulMatches.slice(0, 5)) {
            const favorable = TEAMS[imp.favorable];
            const unfavorable = TEAMS[imp.unfavorable];
            const impactPct = imp.impact.toFixed(1);

            if (imp.match.team1 === teamId || imp.match.team2 === teamId) {
                html += `<li class="good">${ICONS.target} Ganar vs ${imp.match.team1 === teamId ? TEAMS[imp.match.team2].name : TEAMS[imp.match.team1].name} (+${impactPct}% prob.)</li>`;
            } else {
                html += `<li class="good">${ICONS.thumbsUp} Necesita que ${favorable.name} gane vs ${unfavorable.name} (+${impactPct}%)</li>`;
            }
        }
        html += `</ul>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}
