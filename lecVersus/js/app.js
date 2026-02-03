/**
 * Inicializa la aplicación
 */
function initApp() {
    console.log('🏆 LEC Versus 2026 Playoff Calculator - Iniciando...');
    
    // Inicializar componentes
    initTeamSelector();
    initSimulator();
    
    // Seleccionar un equipo por defecto para mostrar escenarios
    const teamSelect = document.getElementById('team-select');
    teamSelect.value = 'FNC'; // Fnatic como ejemplo
    renderScenarios('FNC');
    
    console.log('✅ Aplicación inicializada correctamente');
    console.log(`📊 ${Object.keys(TEAMS).length} equipos cargados`);
    console.log(`🎮 ${REMAINING_MATCHES.length} partidos restantes`);
    console.log(`🎲 ${Math.pow(2, REMAINING_MATCHES.length).toLocaleString()} escenarios posibles`);
}

document.addEventListener('DOMContentLoaded', initApp);
