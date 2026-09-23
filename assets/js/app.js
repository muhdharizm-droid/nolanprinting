/**
 * Nolan Printing Services - Global Application Scripts
 * Theme Toggle, Sound Effects (Web Audio API), Toast Alerts, Live Clock & UI Helpers
 */

(function () {
    'use strict';

    // 1. Theme Management (Light / Dark Mode)
    function initTheme() {
        const savedTheme = localStorage.getItem('np_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(savedTheme);
    }

    window.setTheme = function (theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('np_theme', theme);
        updateThemeButtons(theme);
    };

    window.toggleTheme = function () {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        window.setTheme(newTheme);
    };

    function updateThemeButtons(theme) {
        const togglers = document.querySelectorAll('.theme-toggle-btn');
        togglers.forEach(btn => {
            if (theme === 'dark') {
                btn.innerHTML = '<i class="fas fa-sun text-warning"></i>';
                btn.setAttribute('title', 'Switch to Light Mode');
            } else {
                btn.innerHTML = '<i class="fas fa-moon text-secondary"></i>';
                btn.setAttribute('title', 'Switch to Dark Mode');
            }
        });
    }

    // 2. Mobile Sidebar Drawer Controls
    function initSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const toggler = document.querySelector('.sidebar-toggler');
        
        if (!sidebar || !toggler) return;

        let backdrop = document.querySelector('.sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            backdrop.style.display = 'none';
            document.body.appendChild(backdrop);
        }

        toggler.addEventListener('click', function () {
            sidebar.classList.toggle('show');
            backdrop.style.display = sidebar.classList.contains('show') ? 'block' : 'none';
        });

        backdrop.addEventListener('click', function () {
            sidebar.classList.remove('show');
            backdrop.style.display = 'none';
        });
    }

    // 3. Live Real-time Clock
    function initLiveClock() {
        const clockEls = document.querySelectorAll('.live-clock');
        if (!clockEls.length) return;

        function updateClock() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            clockEls.forEach(el => el.textContent = timeStr);
        }

        updateClock();
        setInterval(updateClock, 1000);
    }

    // 4. Web Audio API Synth Sound Effects
    const AudioEffects = {
        ctx: null,
        getContext() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return this.ctx;
        },
        playBeep(freq = 880, duration = 0.08, type = 'sine') {
            try {
                const ctx = this.getContext();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + duration);
            } catch (e) {
                console.debug('Audio error', e);
            }
        },
        beepSuccess() {
            try {
                const ctx = this.getContext();
                if (!ctx) return;
                const now = ctx.currentTime;
                // Double chime for success (C6 then G6)
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc1.type = 'triangle';
                osc2.type = 'triangle';
                osc1.frequency.setValueAtTime(1046.50, now);
                osc2.frequency.setValueAtTime(1567.98, now + 0.08);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(now);
                osc1.stop(now + 0.08);
                osc2.start(now + 0.08);
                osc2.stop(now + 0.25);
            } catch (e) {}
        },
        beepScan() {
            this.playBeep(1200, 0.06, 'sine');
        },
        beepError() {
            try {
                const ctx = this.getContext();
                if (!ctx) return;
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.linearRampToValueAtTime(150, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            } catch (e) {}
        }
    };

    window.AudioEffects = AudioEffects;

    // 5. Toast Notification System
    window.showToast = function (message, type = 'info', duration = 3500) {
        let container = document.getElementById('np-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'np-toast-container';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }

        const iconMap = {
            success: 'fa-check-circle text-success',
            danger: 'fa-exclamation-circle text-danger',
            warning: 'fa-exclamation-triangle text-warning',
            info: 'fa-info-circle text-info'
        };

        const toastEl = document.createElement('div');
        toastEl.className = 'toast align-items-center border-0 shadow-lg mb-2';
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.style.borderRadius = '12px';
        toastEl.style.background = 'var(--bg-surface-elevated, #ffffff)';
        toastEl.style.color = 'var(--text-main, #0f172a)';

        toastEl.innerHTML = `
            <div class="d-flex p-3 align-items-center">
                <i class="fas ${iconMap[type] || iconMap.info} fa-lg me-3"></i>
                <div class="toast-body p-0 flex-grow-1 fw-medium" style="font-size: 0.9rem;">
                    ${message}
                </div>
                <button type="button" class="btn-close ms-2 me-0" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        container.appendChild(toastEl);
        if (window.bootstrap && bootstrap.Toast) {
            const toast = new bootstrap.Toast(toastEl, { delay: duration });
            toast.show();
            toastEl.addEventListener('hidden.bs.modal', () => toastEl.remove());
        } else {
            toastEl.style.display = 'block';
            setTimeout(() => toastEl.remove(), duration);
        }
    };

    // 6. Currency Formatter Helper
    window.formatRM = function (amount) {
        const val = parseFloat(amount) || 0;
        return 'RM ' + val.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Auto-init on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initSidebar();
        initLiveClock();

        // Enable tooltips if available
        if (window.bootstrap && bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
        }
    });

})();
