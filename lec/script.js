// LocalStorage keys
const STORAGE_KEY = 'lec2026_transfers_edits';
const COLORS_KEY = 'lec2026_row_colors';

// Load edits from localStorage
function loadEdits() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : {};
}

// Save edits to localStorage
function saveEdits(edits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
}

// Load row colors from localStorage
function loadColors() {
  const saved = localStorage.getItem(COLORS_KEY);
  return saved ? JSON.parse(saved) : {};
}

// Save row colors to localStorage
function saveColors(colors) {
  localStorage.setItem(COLORS_KEY, JSON.stringify(colors));
}

// Color rotation: none -> red -> yellow -> green -> none
const COLOR_STATES = ['', 'red', 'yellow', 'green'];

function getNextColor(currentColor) {
  const index = COLOR_STATES.indexOf(currentColor);
  return COLOR_STATES[(index + 1) % COLOR_STATES.length];
}

// Function to make an element editable
function makeEditable(element, team, type, index) {
  element.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    
    // Check if the parent row is green (locked)
    const parentRow = this.closest('.player-row');
    if (parentRow && parentRow.classList.contains('green')) {
      return; // Don't allow editing if row is green
    }
    
    // Check if already editing
    if (this.querySelector('input')) return;
    
    const currentText = this.textContent.trim();
    const originalContent = this.innerHTML;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'edit-input';
    
    // Style the input to match the element
    input.style.width = '100%';
    input.style.textAlign = window.getComputedStyle(this).textAlign;
    input.style.fontSize = window.getComputedStyle(this).fontSize;
    
    // Replace element content with input
    this.innerHTML = '';
    this.appendChild(input);
    input.focus();
    input.select();
    
    let isEditing = true;
    
    // Save on Enter or blur
    const saveEdit = () => {
      if (!isEditing) return;
      isEditing = false;
      
      const newValue = input.value.trim();
      // Allow empty values
      this.textContent = newValue || '—';
      
      // Save to localStorage
      const edits = loadEdits();
      if (!edits[team]) edits[team] = {};
      if (!edits[team][type]) edits[team][type] = {};
      edits[team][type][index] = newValue || '—';
      saveEdits(edits);
    };
    
    // Cancel edit
    const cancelEdit = () => {
      if (!isEditing) return;
      isEditing = false;
      
      this.innerHTML = originalContent;
    };
    
    input.addEventListener('blur', saveEdit);
    
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });
  });
}

// Load CSV and render cards
fetch('transfers_2026_winter.csv')
  .then(response => response.text())
  .then(data => {
    const lines = data.trim().split('\n').slice(1); // Skip header
    const teams = {};
    const baseColors = {}; // Store base colors from CSV

    lines.forEach(line => {
      const [team, role, from, to, coach, status] = line.split(',');
      if (!teams[team]) teams[team] = { players: [], coach: null };
      if (role === 'Coach') {
        teams[team].coach = to;
      } else {
        const playerIndex = teams[team].players.length;
        teams[team].players.push({ role, from, to });
        
        // Store base color if defined
        if (status && status.trim()) {
          const rowId = `${team}-${playerIndex}`;
          baseColors[rowId] = status.trim();
        }
      }
    });

    const container = document.getElementById('teams-container');
    
    // Load saved edits
    const savedEdits = loadEdits();
    
    // Load saved colors and merge with base colors
    const savedColors = loadColors();
    const finalColors = { ...baseColors, ...savedColors }; // User changes override base colors
    
    // Map roles to their corresponding SVG files
    const roleIcons = {
      'Top': 'top.svg',
      'Jungle': 'jgl.svg',
      'Mid': 'mid.svg',
      'ADC': 'bot.svg',
      'Support': 'sup.svg'
    };
    
    // Map team names to their logo files
    const teamLogos = {
      'FNATIC': 'fnatic.webp',
      'G2 ESPORTS': 'g2.webp',
      'GIANTX': 'giantx.webp',
      'KARMINE CORP': 'kc.webp',
      'MOVISTAR KOI': 'mkoi.webp',
      'NATUS VINCERE': 'navi.webp',
      'SK GAMING': 'sk.webp',
      'TEAM BDS': 'bds.webp',
      'TEAM HERETICS': 'th.webp',
      'TEAM VITALITY': 'vitality.webp'
    };
    
    Object.keys(teams).forEach(teamName => {
      const team = teams[teamName];
      const card = document.createElement('div');
      card.className = 'team-card';
      
      // Apply saved edits if they exist
      const teamEdits = savedEdits[teamName] || {};
      
      // Get team logo
      const logoFile = teamLogos[teamName];
      const logoHTML = logoFile ? `<img src="img/logos/${logoFile}" alt="${teamName}" class="team-logo">` : '';
      
      card.innerHTML = `
        <div class="team-name">
          ${logoHTML}
          <span>${teamName}</span>
        </div>
        ${team.players.map((p, idx) => {
          const fromEdit = teamEdits.from && teamEdits.from[idx];
          const toEdit = teamEdits.to && teamEdits.to[idx];
          const rowId = `${teamName}-${idx}`;
          const rowColor = finalColors[rowId] || '';
          return `
            <div class="player-row ${rowColor}" data-row-id="${rowId}">
              <img src="img/roles/${roleIcons[p.role]}" alt="${p.role}" class="role-icon">
              <span class="editable-name" data-team="${teamName}" data-type="from" data-index="${idx}">${fromEdit || p.from}</span>
              <span class="arrow">→</span>
              <span class="editable-name" data-team="${teamName}" data-type="to" data-index="${idx}">${toEdit || p.to}</span>
            </div>
          `;
        }).join('')}
        ${team.coach ? `<div class="coach">
          <img src="img/roles/coach.svg" alt="Coach" class="coach-icon">
          <span class="editable-name" data-team="${teamName}" data-type="coach" data-index="0">${teamEdits.coach && teamEdits.coach[0] ? teamEdits.coach[0] : team.coach}</span>
        </div>` : ''}
      `;
      container.appendChild(card);
      
      // Make all player names and coach editable
      card.querySelectorAll('.editable-name').forEach(element => {
        const team = element.dataset.team;
        const type = element.dataset.type;
        const index = element.dataset.index;
        makeEditable(element, team, type, index);
      });
      
      // Add right-click functionality to player rows
      card.querySelectorAll('.player-row').forEach(row => {
        row.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          
          const rowId = this.dataset.rowId;
          const colors = loadColors();
          const currentColor = colors[rowId] || '';
          const nextColor = getNextColor(currentColor);
          
          // Remove all color classes
          this.classList.remove('red', 'yellow', 'green');
          
          // Add new color class if not empty
          if (nextColor) {
            this.classList.add(nextColor);
          }
          
          // Save to localStorage
          if (nextColor) {
            colors[rowId] = nextColor;
          } else {
            delete colors[rowId];
          }
          saveColors(colors);
        });
      });
    });
    
    // Add reset button functionality
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres resetear todos los cambios?')) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(COLORS_KEY);
          location.reload();
        }
      });
    }
    
    // Load transfer history
    loadTransferHistory(teams);
  });

// Function to load and display transfer history
function loadTransferHistory(teams) {
  const historyContainer = document.getElementById('history-timeline');
  if (!historyContainer) return;
  
  // Sample transfer history data (últimos días del mercado de fichajes)
  // En producción, esto vendría de un archivo o API
  const transferHistory = [
    { date: '8 Oct', team: 'SK GAMING', player: 'Skeanz', role: 'Jungle', from: 'Skeanz', type: 'confirmed' },
    { date: '2 Jul', team: 'NATUS VINCERE', player: 'Rhilech', role: 'Jungle', from: 'Thayger', type: 'confirmed' },
  ];
  
  transferHistory.forEach(transfer => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-date">${transfer.date}</div>
      <div class="history-content">
        <span class="history-team">${transfer.team}</span>
        <span>→</span>
        <span class="history-player">${transfer.player}</span>
        <span class="history-role">(${transfer.role})</span>
        ${transfer.from ? `<span class="history-arrow">reemplaza a</span><span class="history-player">${transfer.from}</span>` : ''}
      </div>
    `;
    historyContainer.appendChild(item);
  });
}
