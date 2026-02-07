/**
 * LEC Versus 2026 — App Controller
 * Handles initialization, navigation, theme, countdown, scroll effects, keyboard shortcuts
 */

const APP_VERSION = '2.1';

// ========== Cache / LocalStorage Versioning ==========
(function purgeStaleCache() {
    const storedVersion = localStorage.getItem('lecVersus_version');
    if (storedVersion !== APP_VERSION) {
        // Preserve theme preference, wipe everything else
        const theme = localStorage.getItem('lecVersus_theme');
        const keys = Object.keys(localStorage).filter(k => k.startsWith('lecVersus'));
        keys.forEach(k => localStorage.removeItem(k));
        if (theme) localStorage.setItem('lecVersus_theme', theme);
        localStorage.setItem('lecVersus_version', APP_VERSION);
        console.log(`[CACHE] Purged stale data (${storedVersion || 'none'} → ${APP_VERSION})`);
    }
})();

// ========== Toast System ==========
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: ICONS.checkCircle,
        info: ICONS.info,
        warning: ICONS.alertTriangle,
        error: ICONS.xCircle
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// ========== Confetti System ==========
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
    const particles = [];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 8 + 4,
            h: Math.random() * 4 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            opacity: 1
        });
    }

    let frame = 0;
    const maxFrames = 180;

    function animate() {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.rotation += p.rotationSpeed;

            if (frame > maxFrames - 40) {
                p.opacity = Math.max(0, p.opacity - 0.025);
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        }

        if (frame < maxFrames) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    animate();
}

// ========== Theme Toggle ==========
function initTheme() {
    const saved = localStorage.getItem('lecVersus_theme');
    const theme = saved || 'dark';
    document.body.setAttribute('data-theme', theme);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('lecVersus_theme', next);
            showToast(next === 'dark' ? 'Tema oscuro activado' : 'Tema claro activado', 'info', 2000);
        });
    }
}

// ========== Navigation ==========
function initNavigation() {
    // Smooth scroll for nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                // Close mobile menu
                closeMobileNav();
            }
        });
    });

    // Brand link scrolls to top
    const brand = document.querySelector('.nav-brand');
    if (brand) {
        brand.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Scroll spy — highlight active nav link
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(l => l.classList.remove('active'));
                const activeLink = document.querySelector(`.nav-link[data-section="${entry.target.id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });

    sections.forEach(sec => observer.observe(sec));

    // Hide/show nav on scroll
    let lastScroll = 0;
    const nav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        if (currentScroll > lastScroll && currentScroll > 300) {
            nav.classList.add('hidden');
        } else {
            nav.classList.remove('hidden');
        }

        lastScroll = currentScroll;
    }, { passive: true });

    // Mobile nav toggle
    const mobileToggle = document.getElementById('mobile-nav-toggle');
    const navLinksContainer = document.getElementById('nav-links');

    if (mobileToggle && navLinksContainer) {
        mobileToggle.addEventListener('click', () => {
            const isOpen = navLinksContainer.classList.contains('mobile-open');
            if (isOpen) {
                closeMobileNav();
            } else {
                navLinksContainer.classList.add('mobile-open');
                mobileToggle.classList.add('active');
                mobileToggle.setAttribute('aria-expanded', 'true');
            }
        });
    }
}

function closeMobileNav() {
    const navLinksContainer = document.getElementById('nav-links');
    const mobileToggle = document.getElementById('mobile-nav-toggle');
    if (navLinksContainer) navLinksContainer.classList.remove('mobile-open');
    if (mobileToggle) {
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
    }
}

// ========== Scroll Reveal ==========
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => observer.observe(el));
}

// ========== Countdown ==========
function initCountdown() {
    // Next match day: Saturday Feb 7, 2026 at 16:45 CET
    const targetDate = new Date('2026-02-07T16:45:00+01:00');
    const wrapper = document.getElementById('countdown-wrapper');

    let intervalId = null;

    function update() {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            if (wrapper) {
                wrapper.innerHTML = `
                    <div class="live-badge">
                        <span class="live-dot"></span>
                        <span>\u00a1Jornada en curso!</span>
                    </div>
                `;
            }
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        const daysEl = document.getElementById('countdown-days');
        const hoursEl = document.getElementById('countdown-hours');
        const minutesEl = document.getElementById('countdown-minutes');
        const secondsEl = document.getElementById('countdown-seconds');

        if (daysEl) daysEl.textContent = days;
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    update();
    intervalId = setInterval(update, 1000);
}

// ========== Scroll to Top ==========
function initScrollToTop() {
    const btn = document.getElementById('scroll-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== Keyboard Shortcuts ==========
function initKeyboardShortcuts() {
    const modal = document.getElementById('shortcuts-modal');
    const closeBtn = document.getElementById('close-shortcuts');

    function openModal() {
        if (modal) {
            modal.hidden = false;
            requestAnimationFrame(() => modal.classList.add('open'));
        }
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => { modal.hidden = true; }, 300);
        }
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Close on overlay click
    const overlay = modal?.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        // Don't trigger if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

        const sections = ['standings', 'simulator', 'scenarios', 'probability'];

        switch (e.key) {
            case '1': case '2': case '3': case '4':
                e.preventDefault();
                const idx = parseInt(e.key) - 1;
                const target = document.getElementById(sections[idx]);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
                break;
            case 'r': case 'R':
                e.preventDefault();
                document.getElementById('reset-btn')?.click();
                break;
            case 'd': case 'D':
                e.preventDefault();
                document.getElementById('random-btn')?.click();
                break;
            case 't': case 'T':
                e.preventDefault();
                document.getElementById('theme-toggle')?.click();
                break;
            case '?':
                e.preventDefault();
                if (modal?.hidden) {
                    openModal();
                } else {
                    closeModal();
                }
                break;
            case 'Escape':
                closeModal();
                closeMobileNav();
                break;
        }
    });
}

// ========== Loading Screen ==========
function hideLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
        screen.classList.add('hidden');
        setTimeout(() => screen.remove(), 600);
    }
}

// ========== Share Functionality (Twitter-style) ==========
function buildShareText() {
    const decided = simulatorState.matches.filter(m => m.winner);
    if (decided.length === 0) return null;

    // Recalc standings with current simulation
    const teams = cloneTeams();
    const h2h = cloneH2H();
    for (const match of simulatorState.matches) {
        if (match.winner) {
            const loserId = match.winner === match.team1 ? match.team2 : match.team1;
            applyMatchResult(teams, h2h, match.winner, loserId);
        }
    }
    const standings = calculateStandings(teams, h2h);
    const top3 = standings.slice(0, 3);
    const podium = ['1\ufe0f\u20e3','2\ufe0f\u20e3','3\ufe0f\u20e3'];

    let lines = [];
    lines.push('\u26a1 LEC Versus 2026 \u2014 Mi predicci\u00f3n\n');

    // Compact results: "W \u25b8 L" separated by " \u00b7 "
    const results = decided.map(m => {
        const w = TEAMS[m.winner].abbr;
        const lId = m.winner === m.team1 ? m.team2 : m.team1;
        return `${w}\u25b8${TEAMS[lId].abbr}`;
    });
    lines.push(results.join(' \u00b7 ') + '\n');

    // Podium
    lines.push(top3.map((t, i) => `${podium[i]} ${t.abbr}`).join('  ') + '\n');

    lines.push(`Simula el tuyo \u2192 brunob.me/lecVersus/`);
    lines.push('#LECVersus2026 #LEC');

    return lines.join('\n');
}

function shareToX() {
    const text = buildShareText();
    if (!text) { showToast('Selecciona al menos un resultado', 'warning'); return; }
    const url = 'https://x.com/intent/tweet?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'width=550,height=420,noopener,noreferrer');
}

function shareToWhatsApp() {
    const text = buildShareText();
    if (!text) { showToast('Selecciona al menos un resultado', 'warning'); return; }
    const url = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
}

function shareCopy() {
    const text = buildShareText();
    if (!text) { showToast('Selecciona al menos un resultado', 'warning'); return; }

    const btn = document.getElementById('share-copy');

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copiado al portapapeles', 'success');
            if (btn) {
                btn.classList.add('copied');
                btn.querySelector('span').innerHTML = ICONS.checkCircle;
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.querySelector('span').innerHTML = ICONS.copy;
                }, 2000);
            }
        }).catch(() => showToast('No se pudo copiar', 'error'));
    }
}

function initShareButton() {
    document.getElementById('share-x')?.addEventListener('click', shareToX);
    document.getElementById('share-wa')?.addEventListener('click', shareToWhatsApp);
    document.getElementById('share-copy')?.addEventListener('click', shareCopy);
}

function initIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.dataset.icon;
        if (ICONS[name]) el.innerHTML = ICONS[name];
    });
}

// ========== Init ==========
function initApp() {
    console.log('[LEC Versus 2026] Playoff Calculator v2.0');

    // Populate SVG icons from data-icon attributes
    initIcons();

    // Core initialization
    initTheme();
    initNavigation();
    initScrollReveal();
    initCountdown();
    initScrollToTop();
    initKeyboardShortcuts();

    // Initialize main components
    initTeamSelector();
    initSimulator();
    initShareButton();

    // Select default team
    const teamSelect = document.getElementById('team-select');
    if (teamSelect) {
        teamSelect.value = 'FNC';
        renderScenarios('FNC');
    }

    // Hide loading screen after a short delay
    setTimeout(hideLoadingScreen, 600);

    console.log('[OK] App initialized');
    console.log(`[INFO] ${Object.keys(TEAMS).length} teams | ${REMAINING_MATCHES.length} matches | ${Math.pow(2, REMAINING_MATCHES.length).toLocaleString()} scenarios`);
}

document.addEventListener('DOMContentLoaded', initApp);
