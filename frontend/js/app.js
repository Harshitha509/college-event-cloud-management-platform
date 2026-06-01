const routes = {
    '/': renderHome,
    '/login': renderLogin,
    '/signup': renderSignup,
    '/forgot-password': renderForgotPassword,
    '/reset-password': renderResetPassword,
    '/events': renderEvents,
    '/calendar': renderCalendar,
    '/dashboard': renderDashboard,
    '/create-event': renderCreateEvent,
    '/edit-event': renderEditEvent,
    '/admin': renderAdminDashboard,
};

function router() {
    updateNav();
    const hashParts = window.location.hash.split('?');
    const path = hashParts[0].slice(1) || '/';
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = '<div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

    const renderFn = routes[path];
    if (renderFn) renderFn(appDiv);
    else appDiv.innerHTML = '<div class="container section text-center"><h2>404 - Page Not Found</h2></div>';
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (state.token) {
        let extraLinks = '';
        if (state.user.role === 'admin') extraLinks += '<li><a href="#/admin" class="nav-link">Analytics Hub</a></li>';
        if (state.user.role === 'admin' || state.user.role === 'organizer') extraLinks += '<li><a href="#/create-event" class="nav-link">Host Event</a></li>';

        navLinks.innerHTML = `
            <li><a href="#/" class="nav-link">Home</a></li>
            <li><a href="#/events" class="nav-link">Catalog</a></li>
            <li><a href="#/calendar" class="nav-link">Calendar</a></li>
            ${extraLinks}
            <li><a href="#/dashboard" class="nav-link btn btn-secondary">Dashboard</a></li>
            <li><a href="#" onclick="logout(event)" class="nav-link btn btn-primary">Logout</a></li>
        `;
    } else {
        navLinks.innerHTML = `
            <li><a href="#/" class="nav-link">Home</a></li>
            <li><a href="#/events" class="nav-link">Events</a></li>
            <li><a href="#/login" class="nav-link btn btn-secondary">Log In</a></li>
            <li><a href="#/signup" class="nav-link btn btn-primary">Sign Up</a></li>
        `;
    }
}

async function renderHome(appDiv) {
    appDiv.innerHTML = `
        <!-- Ambient Background Glow Elements -->
        <div class="ambient-glow bg-glow-1"></div>
        <div class="ambient-glow bg-glow-2"></div>

        <!-- Hero Section -->
        <section class="hero text-center" style="position:relative; z-index:2; padding:7rem 0 4rem 0;">
            <div class="container">
                <span class="badge neon-badge"><i class="fa-solid fa-circle-nodes"></i> Active BMS Event Cluster</span>
                <h1 style="margin-top:1rem;">EVENTCLOUD</h1>
                <p class="hero-subtitle">The Next-Gen Platform for Scalable Event Organization. Host campus gatherings, manage secure seat capacities, and check-in attendees via real-time WebSocket pipelines.</p>
                <div style="margin-top:2.5rem; display:flex; justify-content:center; gap:1.2rem; flex-wrap:wrap;">
                    ${!state.token ? '<a href="#/signup" class="btn btn-primary"><i class="fa-solid fa-user-plus"></i> Join EventCloud</a>' : ''}
                    <a href="#/events" class="btn btn-secondary"><i class="fa-solid fa-magnifying-glass"></i> Explore Catalog</a>
                </div>
            </div>
        </section>

        <!-- Live Metrics Section -->
        <section class="section text-center" style="position:relative; z-index:2; padding:2rem 0 3rem 0;">
            <div class="container">
                <div class="grid-container" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.5rem; margin-top:0;">
                    <div class="stat-card">
                        <i class="fa-solid fa-users stat-icon" style="color:#a855f7;"></i>
                        <h2 class="stat-number" id="stat-users">0</h2>
                        <p class="stat-label">Active Participants</p>
                    </div>
                    <div class="stat-card">
                        <i class="fa-solid fa-calendar-days stat-icon" style="color:#ec4899;"></i>
                        <h2 class="stat-number" id="stat-events">0</h2>
                        <p class="stat-label">Global Events Hosted</p>
                    </div>
                    <div class="stat-card">
                        <i class="fa-solid fa-qrcode stat-icon" style="color:#3b82f6;"></i>
                        <h2 class="stat-number" id="stat-scans">0</h2>
                        <p class="stat-label">Verified Smart Scans</p>
                    </div>
                    <div class="stat-card">
                        <i class="fa-solid fa-server stat-icon" style="color:#10b981;"></i>
                        <h2 class="stat-number" id="stat-load">0%</h2>
                        <p class="stat-label">System Node Health</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Concept Walkthrough Section -->
        <section class="section" style="position:relative; z-index:2; border-top:1px solid var(--surface-border); border-bottom:1px solid var(--surface-border); background:rgba(0,0,0,0.2); backdrop-filter:blur(5px); padding:4rem 0;">
            <div class="container">
                <h2 class="text-center" style="font-size:2.5rem; margin-bottom:1rem; font-family:var(--font-heading);">System Walkthrough</h2>
                <p class="text-center" style="color:var(--text-secondary); max-width:650px; margin: 0 auto 3.5rem auto; font-size:1.05rem;">
                    EventCloud automates BMS campus event scheduling and security. Toggle the stages below to explore how our unified architecture protects operations.
                </p>

                <div class="interactive-steps-container" style="max-width:850px; margin:0 auto;">
                    <div class="steps-nav" style="display:flex; justify-content:center; gap:0.8rem; margin-bottom:2rem; flex-wrap:wrap;">
                        <button onclick="switchStep(1)" class="step-btn active-step" id="step-btn-1"><span class="step-num">1</span> Account</button>
                        <button onclick="switchStep(2)" class="step-btn" id="step-btn-2"><span class="step-num">2</span> Hosting</button>
                        <button onclick="switchStep(3)" class="step-btn" id="step-btn-3"><span class="step-num">3</span> Smart ticket</button>
                        <button onclick="switchStep(4)" class="step-btn" id="step-btn-4"><span class="step-num">4</span> Verification</button>
                    </div>

                    <div class="step-content-card card" id="step-display" style="padding:2.5rem; min-height: 220px; transition:all 0.3s ease; box-shadow:0 20px 40px rgba(0,0,0,0.4);">
                        <!-- Dynamically populated step content -->
                    </div>
                </div>
            </div>
        </section>

        <!-- Highlights Features Grid -->
        <section class="section" style="position:relative; z-index:2; padding:5rem 0;">
            <div class="container">
                <h2 class="text-center" style="font-size:2.5rem; margin-bottom:3.5rem; font-family:var(--font-heading);">Platform Capabilities</h2>
                <div class="grid-container" style="margin-top:0;">
                    <div class="card hover-glow">
                        <div class="feature-icon-wrapper" style="background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.3); width:54px; height:54px; border-radius:14px; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem;">
                            <i class="fa-solid fa-bolt" style="color:#a855f7; font-size:1.3rem;"></i>
                        </div>
                        <h3>Real-Time Event Feeds</h3>
                        <p>Stay updated instantly. WebSockets trigger live changes in the global event catalog, dashboard check-ins, and user registrations without reloading.</p>
                    </div>
                    <div class="card hover-glow">
                        <div class="feature-icon-wrapper" style="background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.3); width:54px; height:54px; border-radius:14px; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem;">
                            <i class="fa-solid fa-shield-halved" style="color:#ec4899; font-size:1.3rem;"></i>
                        </div>
                        <h3>Strict Authentication</h3>
                        <p>Enhanced with brute-force lockout safeguards, live password quality meters, strict confirm match rules, and secure bcrypt hashing standards.</p>
                    </div>
                    <div class="card hover-glow">
                        <div class="feature-icon-wrapper" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); width:54px; height:54px; border-radius:14px; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem;">
                            <i class="fa-solid fa-qrcode" style="color:#10b981; font-size:1.3rem;"></i>
                        </div>
                        <h3>Micro-QR Admissions</h3>
                        <p>Host organizers verify admission tickets instantly using a mobile device camera scan or quick manual input tools with zero latency.</p>
                    </div>
                </div>
            </div>
        </section>
    `;

    const stepsData = {
        1: {
            title: "Strict Account Creation",
            icon: "fa-solid fa-user-lock",
            desc: "Register a secure profile using our reinforced credential guidelines. The real-time password strength meter and confirm-verification guards ensure all account sessions are shield-protected from brute-force threats from day one.",
            color: "#a855f7",
            action: "#/signup",
            actionText: "Get Started"
        },
        2: {
            title: "Flexible Event Scheduling",
            icon: "fa-solid fa-calendar-plus",
            desc: "Organizers can host events in seconds. Outline strict attendee caps, customize timing schedules, and coordinate venue details. All active sessions sync to the global event listing instantly via WebSockets.",
            color: "#ec4899",
            action: "#/events",
            actionText: "Explore Catalog"
        },
        3: {
            title: "Secure Cryptographic Tickets",
            icon: "fa-solid fa-ticket",
            desc: "Attendees book seats with a single click. EventCloud compiles an encrypted seat reservation and outputs a high-definition QR ticket code, securely displayed in your cloud control dashboard.",
            color: "#3b82f6",
            action: "#/dashboard",
            actionText: "View Dashboard"
        },
        4: {
            title: "Real-Time Scan Verification",
            icon: "fa-solid fa-circle-check",
            desc: "Hosts scan tickets at the door using our seamless integrated webcam scanner. Attendance sheets and system analytics charts update in real-time, displaying real-time traffic statistics.",
            color: "#10b981",
            action: "#/dashboard",
            actionText: "Check Dashboard"
        }
    };

    window.switchStep = function(num) {
        const step = stepsData[num];
        if (!step) return;

        for (let i = 1; i <= 4; i++) {
            const btn = document.getElementById(`step-btn-${i}`);
            if (btn) {
                if (i === num) {
                    btn.classList.add('active-step');
                    btn.style.borderColor = step.color;
                    btn.style.boxShadow = `0 4px 15px -2px ${step.color}50`;
                } else {
                    btn.classList.remove('active-step');
                    btn.style.borderColor = 'var(--surface-border)';
                    btn.style.boxShadow = 'none';
                }
            }
        }

        const display = document.getElementById('step-display');
        if (display) {
            display.style.opacity = '0';
            display.style.transform = 'translateY(10px)';
            setTimeout(() => {
                display.innerHTML = `
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:1.2rem;">
                        <div style="background:${step.color}; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 15px ${step.color}40;">
                            <i class="${step.icon}" style="color:#fff; font-size:1.3rem;"></i>
                        </div>
                        <h3 style="margin-bottom:0; font-size:1.6rem; color:var(--text-primary); font-family:var(--font-heading);">${step.title}</h3>
                    </div>
                    <p style="color:var(--text-secondary); margin-bottom:1.8rem; font-size:1.02rem; line-height:1.7;">${step.desc}</p>
                    <div>
                        <a href="${step.action}" class="btn" style="background:${step.color}; color:#fff; box-shadow:0 8px 25px -5px ${step.color}60; font-size:0.85rem; padding:0.7rem 1.6rem;">${step.actionText}</a>
                    </div>
                `;
                display.style.opacity = '1';
                display.style.transform = 'translateY(0)';
            }, 200);
        }
    };

    // Init Step 1
    switchStep(1);

    // Animated Live Counters
    const targets = { users: 1428, events: 124, scans: 852, load: 99 };
    const increments = { users: 37, events: 4, scans: 23, load: 3 };
    const current = { users: 0, events: 0, scans: 0, load: 0 };

    const interval = setInterval(() => {
        let completed = true;
        for (const key in targets) {
            if (current[key] < targets[key]) {
                completed = false;
                current[key] = Math.min(targets[key], current[key] + increments[key]);
                const el = document.getElementById(`stat-${key}`);
                if (el) {
                    el.innerText = key === 'load' ? `${current[key]}%` : current[key].toLocaleString();
                }
            }
        }
        if (completed) {
            clearInterval(interval);
            // Lockup variance for load stats
            const loadInterval = setInterval(() => {
                const el = document.getElementById('stat-load');
                if (!el) {
                    clearInterval(loadInterval);
                    return;
                }
                const load = 98 + Math.random() * 2;
                el.innerText = `${load.toFixed(2)}%`;
            }, 3000);
        }
    }, 25);
}
