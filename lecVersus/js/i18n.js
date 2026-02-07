/**
 * LEC Versus 2026 — Internationalization Module
 * Supports English and Spanish
 */

const TRANSLATIONS = {
    es: {
        // Meta
        pageTitle: 'LEC Versus 2026 - Calculadora de Playoffs',
        pageDescription: 'Calculadora interactiva de probabilidades y simulador de partidos para la LEC 2026. Predice quién llegará a los Playoffs.',
        
        // Navigation
        navStandings: 'Clasificación',
        navSimulator: 'Simulador',
        navScenarios: 'Escenarios',
        navProbability: 'Probabilidades',
        navTheme: 'Cambiar tema',
        navMenu: 'Menú',
        
        // Loading
        loadingText: 'Calculando escenarios...',
        
        // Header
        headerTitle: 'LEC Versus 2026',
        headerSubtitle: 'Calculadora de Probabilidades de Playoffs',
        countdownLabel: 'Próxima jornada en',
        days: 'días',
        hours: 'horas',
        min: 'min',
        sec: 'seg',
        
        // Simulation Progress
        simProgressLabel: 'Progreso de Simulación',
        simProgressCount: '{0} / 12 partidos',
        
        // Standings
        standingsTitle: 'Clasificación Actual',
        top8Playoffs: 'Top 8 → Playoffs',
        eliminated: '9-12 → Eliminados',
        thPosition: '#',
        thTeam: 'Equipo',
        thWins: 'V',
        thLosses: 'D',
        thWinrate: '%',
        thPlayoffProb: 'Prob. Playoffs',
        
        // Simulator
        simulatorTitle: 'Simulador de Partidos',
        simulatorDesc: 'Selecciona el ganador de cada partido para ver cómo afecta a la clasificación',
        btnReset: 'Reiniciar',
        btnRandom: 'Aleatorios',
        shareX: 'Compartir en X',
        shareWA: 'Compartir en WhatsApp',
        shareCopy: 'Copiar al portapapeles',
        saturday: 'Sábado 7 de Febrero',
        sunday: 'Domingo 8 de Febrero',
        selectWinner: 'Seleccionar {0} como ganador',
        
        // Scenarios
        scenariosTitle: 'Escenarios de Clasificación',
        scenariosDesc: 'Selecciona un equipo para ver qué necesita para clasificar a playoffs',
        teamLabel: 'Equipo:',
        teamSelectPlaceholder: 'Selecciona un equipo...',
        
        // Probability
        probabilityTitle: 'Análisis de Probabilidades',
        probabilityDesc: 'Basado en todas las combinaciones posibles de resultados restantes',
        statRemainingMatches: 'Partidos Restantes',
        statTotalScenarios: 'Escenarios Totales',
        statSelected: 'Seleccionados',
        statPossibleScenarios: 'Escenarios Posibles',
        
        // Footer
        footerCalc: 'Todos los datos son calculados en tiempo real en tu navegador',
        footerCredits: 'Hecho con',
        footerBy: 'por',
        footerTeams: '12 equipos',
        footerScenarios: '4,096 escenarios',
        
        // Scroll
        scrollTop: 'Volver arriba',
        
        // Keyboard Shortcuts
        shortcutsTitle: 'Atajos de Teclado',
        shortcutNav: 'Navegar a sección',
        shortcutReset: 'Reiniciar simulación',
        shortcutRandom: 'Resultados aleatorios',
        shortcutTheme: 'Cambiar tema',
        shortcutShow: 'Mostrar atajos',
        btnClose: 'Cerrar',
        
        // Toasts
        toastReset: 'Simulación reiniciada',
        toastRandom: 'Resultados aleatorios generados',
        toastCopied: '¡Copiado al portapapeles!',
        toastLangChanged: 'Idioma cambiado a Español',
        
        // Scenarios content
        scenarioQualified: 'Clasificado a Playoffs',
        scenarioEliminated: 'Eliminado de Playoffs',
        scenarioChanceToQualify: '{0} de clasificar',
        scenarioCurrentSituation: 'Situación actual',
        scenarioRemainingMatches: 'Sus partidos restantes',
        scenarioKeyMatches: 'Partidos clave para {0}',
        scenarioVictory: 'Victoria',
        scenarioDefeat: 'Derrota',
        scenarioToBePlayed: 'Por jugar',
        scenarioWinVs: 'Ganar vs {0}',
        scenarioNeedsWin: 'Necesita que {0} gane vs {1}',
        scenarioMagicNumber: 'Magic Number',
        scenarioMagicDesc: '{0} necesita {1} victoria(s) más para asegurar playoffs',
        scenarioDepends: 'Depende de otros resultados',
        scenarioBestCase: 'Mejor caso',
        scenarioWorstCase: 'Peor caso',
        scenarioWins: 'victorias',
        scenarioLosses: 'derrotas',
        // Scenario descriptions
        scenarioDescQualified: '{0} ya está matemáticamente clasificado a playoffs.',
        scenarioDescEliminated: '{0} está matemáticamente eliminado de playoffs.',
        scenarioDescProbability: '{0} tiene {1} de probabilidad de clasificar.',
        scenarioDescRemainingMatches: 'Juega {0} partido(s) restante(s).',
        scenarioDescWinAll: 'Si gana todos sus partidos: Clasificado',
        scenarioDescBestCase: 'Mejor caso (gana todo): {0} de clasificar',
        scenarioDescLoseAll: 'Si pierde todos sus partidos: Eliminado',
        scenarioDescWorstCase: 'Peor caso (pierde todo): {0} de clasificar'
    },
    en: {
        // Meta
        pageTitle: 'LEC Versus 2026 - Playoffs Calculator',
        pageDescription: 'Interactive probability calculator and match simulator for LEC 2026. Predict who will make Playoffs.',
        
        // Navigation
        navStandings: 'Standings',
        navSimulator: 'Simulator',
        navScenarios: 'Scenarios',
        navProbability: 'Probabilities',
        navTheme: 'Toggle theme',
        navMenu: 'Menu',
        
        // Loading
        loadingText: 'Calculating scenarios...',
        
        // Header
        headerTitle: 'LEC Versus 2026',
        headerSubtitle: 'Playoffs Probability Calculator',
        countdownLabel: 'Next matchday in',
        days: 'days',
        hours: 'hours',
        min: 'min',
        sec: 'sec',
        
        // Simulation Progress
        simProgressLabel: 'Simulation Progress',
        simProgressCount: '{0} / 12 matches',
        
        // Standings
        standingsTitle: 'Current Standings',
        top8Playoffs: 'Top 8 → Playoffs',
        eliminated: '9-12 → Eliminated',
        thPosition: '#',
        thTeam: 'Team',
        thWins: 'W',
        thLosses: 'L',
        thWinrate: '%',
        thPlayoffProb: 'Playoff Prob.',
        
        // Simulator
        simulatorTitle: 'Match Simulator',
        simulatorDesc: 'Select the winner of each match to see how it affects the standings',
        btnReset: 'Reset',
        btnRandom: 'Random',
        shareX: 'Share on X',
        shareWA: 'Share on WhatsApp',
        shareCopy: 'Copy to clipboard',
        saturday: 'Saturday, February 7',
        sunday: 'Sunday, February 8',
        selectWinner: 'Select {0} as winner',
        
        // Scenarios
        scenariosTitle: 'Qualification Scenarios',
        scenariosDesc: 'Select a team to see what they need to qualify for playoffs',
        teamLabel: 'Team:',
        teamSelectPlaceholder: 'Select a team...',
        
        // Probability
        probabilityTitle: 'Probability Analysis',
        probabilityDesc: 'Based on all possible combinations of remaining results',
        statRemainingMatches: 'Remaining Matches',
        statTotalScenarios: 'Total Scenarios',
        statSelected: 'Selected',
        statPossibleScenarios: 'Possible Scenarios',
        
        // Footer
        footerCalc: 'All data is calculated in real-time in your browser',
        footerCredits: 'Made with',
        footerBy: 'by',
        footerTeams: '12 teams',
        footerScenarios: '4,096 scenarios',
        
        // Scroll
        scrollTop: 'Back to top',
        
        // Keyboard Shortcuts
        shortcutsTitle: 'Keyboard Shortcuts',
        shortcutNav: 'Navigate to section',
        shortcutReset: 'Reset simulation',
        shortcutRandom: 'Random results',
        shortcutTheme: 'Toggle theme',
        shortcutShow: 'Show shortcuts',
        btnClose: 'Close',
        
        // Toasts
        toastReset: 'Simulation reset',
        toastRandom: 'Random results generated',
        toastCopied: 'Copied to clipboard!',
        toastLangChanged: 'Language changed to English',
        
        // Scenarios content
        scenarioQualified: 'Qualified for Playoffs',
        scenarioEliminated: 'Eliminated from Playoffs',
        scenarioChanceToQualify: '{0} chance to qualify',
        scenarioCurrentSituation: 'Current situation',
        scenarioRemainingMatches: 'Their remaining matches',
        scenarioKeyMatches: 'Key matches for {0}',
        scenarioVictory: 'Victory',
        scenarioDefeat: 'Defeat',
        scenarioToBePlayed: 'To be played',
        scenarioWinVs: 'Win vs {0}',
        scenarioNeedsWin: 'Needs {0} to beat {1}',
        scenarioMagicNumber: 'Magic Number',
        scenarioMagicDesc: '{0} needs {1} more win(s) to secure playoffs',
        scenarioDepends: 'Depends on other results',
        scenarioBestCase: 'Best case',
        scenarioWorstCase: 'Worst case',
        scenarioWins: 'wins',
        scenarioLosses: 'losses',
        // Scenario descriptions
        scenarioDescQualified: '{0} is already mathematically qualified for playoffs.',
        scenarioDescEliminated: '{0} is mathematically eliminated from playoffs.',
        scenarioDescProbability: '{0} has {1} probability to qualify.',
        scenarioDescRemainingMatches: 'Plays {0} remaining match(es).',
        scenarioDescWinAll: 'If they win all their matches: Qualified',
        scenarioDescBestCase: 'Best case (wins all): {0} chance to qualify',
        scenarioDescLoseAll: 'If they lose all their matches: Eliminated',
        scenarioDescWorstCase: 'Worst case (loses all): {0} chance to qualify'
    }
};

let currentLang = 'es';

function initI18n() {
    const savedLang = localStorage.getItem('lecVersus_lang');
    currentLang = savedLang || (navigator.language.startsWith('en') ? 'en' : 'es');
    applyTranslations();
    updateLangToggle();
}

function t(key, ...args) {
    let text = TRANSLATIONS[currentLang][key] || TRANSLATIONS['es'][key] || key;
    // Replace {0}, {1}, etc. with arguments
    args.forEach((arg, i) => {
        text = text.replace(`{${i}}`, arg);
    });
    return text;
}

function setLanguage(lang) {
    if (lang !== 'es' && lang !== 'en') return;
    currentLang = lang;
    localStorage.setItem('lecVersus_lang', lang);
    document.documentElement.lang = lang;
    applyTranslations();
    updateLangToggle();
    
    // Re-render dynamic content
    if (typeof updateSimulation === 'function') updateSimulation();
    if (typeof initTeamSelector === 'function') initTeamSelector();
    
    // Re-render scenarios if a team is selected
    const teamSelect = document.getElementById('team-select');
    if (teamSelect && teamSelect.value && typeof renderScenarios === 'function') {
        renderScenarios(teamSelect.value);
    }
    
    showToast(t('toastLangChanged'), 'info', 2000);
}

function toggleLanguage() {
    setLanguage(currentLang === 'es' ? 'en' : 'es');
}

function updateLangToggle() {
    const btn = document.getElementById('lang-toggle');
    if (btn) {
        btn.textContent = currentLang === 'es' ? 'EN' : 'ES';
        btn.setAttribute('aria-label', currentLang === 'es' ? 'Switch to English' : 'Cambiar a Español');
    }
}

function applyTranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    
    // Update elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    // Update elements with data-i18n-aria
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        el.setAttribute('aria-label', t(key));
    });
    
    // Update elements with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });
    
    // Update document title
    document.title = t('pageTitle');
}

function getCurrentLang() {
    return currentLang;
}
