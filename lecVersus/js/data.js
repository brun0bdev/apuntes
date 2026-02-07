const TEAMS = {
    KC: { id: 'KC', name: 'Karmine Corp', abbr: 'KC', wins: 8, losses: 2, logo: 'img/logos/kc.webp' },
    NAVI: { id: 'NAVI', name: 'Natus Vincere', abbr: 'NAVI', wins: 7, losses: 3, logo: 'img/logos/navi.webp' },
    GX: { id: 'GX', name: 'GIANTX', abbr: 'GX', wins: 6, losses: 4, logo: 'img/logos/giantx.webp' },
    VIT: { id: 'VIT', name: 'Team Vitality', abbr: 'VIT', wins: 6, losses: 4, logo: 'img/logos/vitality.webp' },
    FNC: { id: 'FNC', name: 'Fnatic', abbr: 'FNC', wins: 5, losses: 5, logo: 'img/logos/fnatic.webp' },
    G2: { id: 'G2', name: 'G2 Esports', abbr: 'G2', wins: 5, losses: 5, logo: 'img/logos/g2.webp' },
    MKOI: { id: 'MKOI', name: 'Movistar KOI', abbr: 'MKOI', wins: 5, losses: 5, logo: 'img/logos/mkoi.webp' },
    TH: { id: 'TH', name: 'Team Heretics', abbr: 'TH', wins: 5, losses: 5, logo: 'img/logos/th.webp' },
    LR: { id: 'LR', name: 'Los Ratones', abbr: 'LR', wins: 5, losses: 5, logo: 'img/logos/lr.png' },
    SHFT: { id: 'SHFT', name: 'Shifters', abbr: 'SHFT', wins: 4, losses: 6, logo: 'img/logos/shifters.webp' },
    SK: { id: 'SK', name: 'SK Gaming', abbr: 'SK', wins: 3, losses: 7, logo: 'img/logos/sk.webp' },
    KCB: { id: 'KCB', name: 'Karmine Corp Blue', abbr: 'KCB', wins: 1, losses: 9, logo: 'img/logos/KC_Blue.webp' }
};

const TEAM_ORDER = ['FNC', 'G2', 'GX', 'KC', 'KCB', 'LR', 'MKOI', 'NAVI', 'SHFT', 'SK', 'TH', 'VIT'];

// Matriz H2H: H2H[teamA][teamB] = { wins: X, losses: Y } para teamA vs teamB
const H2H = {
    FNC: {
        FNC: { wins: 0, losses: 0 },
        G2: { wins: 0, losses: 0 },
        GX: { wins: 1, losses: 0 },
        KC: { wins: 0, losses: 1 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 1, losses: 0 },
        MKOI: { wins: 0, losses: 1 },
        NAVI: { wins: 1, losses: 0 },
        SHFT: { wins: 0, losses: 1 },
        SK: { wins: 0, losses: 1 },
        TH: { wins: 0, losses: 1 },
        VIT: { wins: 1, losses: 0 }
    },
    G2: {
        FNC: { wins: 0, losses: 0 },
        G2: { wins: 0, losses: 0 },
        GX: { wins: 0, losses: 1 },
        KC: { wins: 0, losses: 1 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 0, losses: 1 },
        MKOI: { wins: 0, losses: 1 },
        NAVI: { wins: 0, losses: 1 },
        SHFT: { wins: 1, losses: 0 },
        SK: { wins: 1, losses: 0 },
        TH: { wins: 1, losses: 0 },
        VIT: { wins: 1, losses: 0 }
    },
    GX: {
        FNC: { wins: 0, losses: 1 },
        G2: { wins: 1, losses: 0 },
        GX: { wins: 0, losses: 0 },
        KC: { wins: 0, losses: 1 },
        KCB: { wins: 0, losses: 0 },
        LR: { wins: 1, losses: 0 },
        MKOI: { wins: 1, losses: 0 },
        NAVI: { wins: 1, losses: 0 },
        SHFT: { wins: 1, losses: 0 },
        SK: { wins: 1, losses: 0 },
        TH: { wins: 0, losses: 1 },
        VIT: { wins: 0, losses: 1 }
    },
    KC: {
        FNC: { wins: 1, losses: 0 },
        G2: { wins: 1, losses: 0 },
        GX: { wins: 1, losses: 0 },
        KC: { wins: 0, losses: 0 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 1, losses: 0 },
        MKOI: { wins: 0, losses: 1 },
        NAVI: { wins: 1, losses: 0 },
        SHFT: { wins: 1, losses: 0 },
        SK: { wins: 1, losses: 0 },
        TH: { wins: 0, losses: 0 },
        VIT: { wins: 0, losses: 1 }
    },
    KCB: {
        FNC: { wins: 0, losses: 1 },
        G2: { wins: 0, losses: 1 },
        GX: { wins: 0, losses: 0 },
        KC: { wins: 0, losses: 1 },
        KCB: { wins: 0, losses: 0 },
        LR: { wins: 1, losses: 0 },
        MKOI: { wins: 0, losses: 1 },
        NAVI: { wins: 0, losses: 1 },
        SHFT: { wins: 0, losses: 1 },
        SK: { wins: 0, losses: 1 },
        TH: { wins: 0, losses: 1 },
        VIT: { wins: 0, losses: 1 }
    },
    LR: {
        FNC: { wins: 0, losses: 1 },
        G2: { wins: 1, losses: 0 },
        GX: { wins: 0, losses: 1 },
        KC: { wins: 0, losses: 1 },
        KCB: { wins: 0, losses: 1 },
        LR: { wins: 0, losses: 0 },
        MKOI: { wins: 1, losses: 0 },
        NAVI: { wins: 0, losses: 1 },
        SHFT: { wins: 1, losses: 0 },
        SK: { wins: 1, losses: 0 },
        TH: { wins: 1, losses: 0 },
        VIT: { wins: 0, losses: 0 }
    },
    MKOI: {
        FNC: { wins: 1, losses: 0 },
        G2: { wins: 1, losses: 0 },
        GX: { wins: 0, losses: 1 },
        KC: { wins: 1, losses: 0 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 0, losses: 1 },
        MKOI: { wins: 0, losses: 0 },
        NAVI: { wins: 0, losses: 0 },
        SHFT: { wins: 0, losses: 1 },
        SK: { wins: 1, losses: 0 },
        TH: { wins: 0, losses: 1 },
        VIT: { wins: 0, losses: 1 }
    },
    NAVI: {
        FNC: { wins: 0, losses: 1 },
        G2: { wins: 1, losses: 0 },
        GX: { wins: 0, losses: 1 },
        KC: { wins: 0, losses: 1 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 1, losses: 0 },
        MKOI: { wins: 0, losses: 0 },
        NAVI: { wins: 0, losses: 0 },
        SHFT: { wins: 1, losses: 0 },
        SK: { wins: 1, losses: 0 },
        TH: { wins: 1, losses: 0 },
        VIT: { wins: 1, losses: 0 }
    },
    SHFT: {
        FNC: { wins: 1, losses: 0 },
        G2: { wins: 0, losses: 1 },
        GX: { wins: 0, losses: 1 },
        KC: { wins: 0, losses: 1 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 0, losses: 1 },
        MKOI: { wins: 1, losses: 0 },
        NAVI: { wins: 0, losses: 1 },
        SHFT: { wins: 0, losses: 0 },
        SK: { wins: 0, losses: 0 },
        TH: { wins: 1, losses: 0 },
        VIT: { wins: 0, losses: 1 }
    },
    SK: {
        FNC: { wins: 1, losses: 0 },
        G2: { wins: 0, losses: 1 },
        GX: { wins: 0, losses: 1 },
        KC: { wins: 0, losses: 1 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 0, losses: 1 },
        MKOI: { wins: 0, losses: 1 },
        NAVI: { wins: 0, losses: 1 },
        SHFT: { wins: 0, losses: 0 },
        SK: { wins: 0, losses: 0 },
        TH: { wins: 1, losses: 0 },
        VIT: { wins: 0, losses: 1 }
    },
    TH: {
        FNC: { wins: 1, losses: 0 },
        G2: { wins: 0, losses: 1 },
        GX: { wins: 1, losses: 0 },
        KC: { wins: 0, losses: 0 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 0, losses: 1 },
        MKOI: { wins: 1, losses: 0 },
        NAVI: { wins: 0, losses: 1 },
        SHFT: { wins: 0, losses: 1 },
        SK: { wins: 0, losses: 1 },
        TH: { wins: 0, losses: 0 },
        VIT: { wins: 1, losses: 0 }
    },
    VIT: {
        FNC: { wins: 0, losses: 1 },
        G2: { wins: 0, losses: 1 },
        GX: { wins: 1, losses: 0 },
        KC: { wins: 1, losses: 0 },
        KCB: { wins: 1, losses: 0 },
        LR: { wins: 0, losses: 0 },
        MKOI: { wins: 1, losses: 0 },
        NAVI: { wins: 0, losses: 1 },
        SHFT: { wins: 1, losses: 0 },
        SK: { wins: 1, losses: 0 },
        TH: { wins: 0, losses: 1 },
        VIT: { wins: 0, losses: 0 }
    }
};

const REMAINING_MATCHES = [
    // Domingo 8 de Febrero
    { id: 1, team1: 'VIT', team2: 'LR', date: '2026-02-08', time: '16:45', day: 'sunday', winner: null },
    { id: 2, team1: 'KCB', team2: 'GX', date: '2026-02-08', time: '17:30', day: 'sunday', winner: null },
    { id: 3, team1: 'SK', team2: 'SHFT', date: '2026-02-08', time: '18:15', day: 'sunday', winner: null },
    { id: 4, team1: 'NAVI', team2: 'MKOI', date: '2026-02-08', time: '19:00', day: 'sunday', winner: null },
    { id: 5, team1: 'TH', team2: 'KC', date: '2026-02-08', time: '19:45', day: 'sunday', winner: null },
    { id: 6, team1: 'FNC', team2: 'G2', date: '2026-02-08', time: '20:30', day: 'sunday', winner: null }
];

function cloneTeams() {
    const cloned = {};
    for (const [key, team] of Object.entries(TEAMS)) {
        cloned[key] = { ...team };
    }
    return cloned;
}

function cloneH2H() {
    const cloned = {};
    for (const [teamA, opponents] of Object.entries(H2H)) {
        cloned[teamA] = {};
        for (const [teamB, record] of Object.entries(opponents)) {
            cloned[teamA][teamB] = { ...record };
        }
    }
    return cloned;
}

function cloneMatches() {
    return REMAINING_MATCHES.map(m => ({ ...m }));
}
