const app = document.getElementById('app');
const projectsNav = document.getElementById('projects-nav');

function parseHash() {
    const hash = location.hash.slice(1) || 'dashboard';
    const [path, query] = hash.split('?');
    const params = new URLSearchParams(query || '');
    return { path, params };
}

async function navigate() {
    const { path, params } = parseHash();
    await renderSidebar(path, params);

    app.classList.remove('animate-fade-in');
    void app.offsetWidth;
    app.classList.add('animate-fade-in');

    const main = path.split('/')[0];
    switch (main) {
        case 'dashboard':          await renderDashboard(); break;
        case 'project':            await renderProject(params.get('name'), params.get('tab') || 'agents'); break;
        case 'admin-general':      renderAdminGeneral(); break;
        case 'admin-users':        renderAdminUsers(); break;
        case 'admin-llm':          renderAdminLlm(); break;
        case 'admin-integrations': renderAdminIntegrations(); break;
        case 'admin-audit':        renderAdminAudit(); break;
        default:                   await renderDashboard();
    }
}

async function renderSidebar(path, params) {
    const projects = await Api.getProjects();
    const currentKey = path === 'project' ? 'project:' + params.get('name') : path;

    projectsNav.innerHTML = projects.map(p => {
        const active = currentKey === 'project:' + p.project_name ? 'active' : '';
        const statusDot = p.run_status === 'running'
            ? '<span class="relative w-1.5 h-1.5 rounded-full bg-accent-success dot-running flex-shrink-0"></span>'
            : p.run_status === 'error'
                ? '<span class="w-1.5 h-1.5 rounded-full bg-accent-error flex-shrink-0"></span>'
                : '<span class="w-1.5 h-1.5 rounded-full bg-on-surface-subtle flex-shrink-0"></span>';
        return `<a href="#project?name=${p.project_name}" data-tooltip="${p.project_name}" class="sidebar-item ${active}">
            <span class="icon"><span class="material-icons-outlined" style="font-size: 20px;">folder_special</span></span>
            <span class="label-text flex-1 truncate">${p.project_name}</span>
            <span class="badge-count">${statusDot}</span>
        </a>`;
    }).join('');

    document.querySelectorAll('[data-nav]').forEach(el => {
        el.classList.toggle('active', el.dataset.nav === path);
    });

    // Users badge count
    const usersBadge = document.getElementById('usersBadge');
    if (usersBadge) usersBadge.textContent = String(MOCK_ADMIN.users.length).padStart(2, '0');
}

// ==================== Helpers ====================
function pageHeader(title, subtitle, actions = '') {
    return `<div class="flex items-start justify-between mb-10">
        <div>
            <h1 class="font-display text-4xl font-extrabold tracking-tight">${title}</h1>
            ${subtitle ? `<p class="text-on-surface-muted mt-2">${subtitle}</p>` : ''}
        </div>
        ${actions ? `<div class="flex items-center gap-3">${actions}</div>` : ''}
    </div>`;
}

function sectionHeader(title, subtitle, actions = '') {
    return `<div class="flex items-center justify-between mb-5">
        <div>
            <h3 class="font-display font-bold text-xl">${title}</h3>
            ${subtitle ? `<p class="text-sm text-on-surface-muted mt-0.5">${subtitle}</p>` : ''}
        </div>
        ${actions ? `<div>${actions}</div>` : ''}
    </div>`;
}

function metricCard({ icon, label, value, trend, color = 'primary', accent = '' }) {
    return `<div class="relative card-hover card-glow-top bg-surface-2/60 rounded-2xl p-6 overflow-hidden">
        ${accent ? `<div class="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 bg-${color}"></div>` : ''}
        <div class="relative flex items-start justify-between mb-4">
            <div class="w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center">
                <span class="material-icons-outlined text-${color}" style="font-size: 20px;">${icon}</span>
            </div>
            ${trend !== undefined ? `<span class="badge ${trend >= 0 ? 'text-accent-success bg-accent-success/10' : 'text-accent-error bg-accent-error/10'}">
                <span class="material-icons-outlined text-xs">${trend >= 0 ? 'trending_up' : 'trending_down'}</span>
                ${Math.abs(trend)}%
            </span>` : ''}
        </div>
        <div class="relative">
            <div class="text-xs text-on-surface-muted uppercase tracking-wider mb-1">${label}</div>
            <div class="text-3xl font-display font-extrabold tracking-tight">${value}</div>
        </div>
    </div>`;
}

function kpiCard({ icon, label, value, delta, trend, sub, color = 'primary' }) {
    const trendStyle = trend === 'up'
        ? 'text-accent-success bg-accent-success/10'
        : trend === 'down'
            ? 'text-accent-error bg-accent-error/10'
            : 'text-on-surface-muted bg-surface-4';
    const trendIcon = trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat';
    return `<div class="stat-card card-hover card-glow-top border-gradient bg-surface-2/60 rounded-2xl p-5">
        <div class="stat-card-icon-bg bg-${color}"></div>
        <div class="relative flex items-start justify-between mb-5">
            <div class="w-11 h-11 rounded-xl bg-${color}/10 flex items-center justify-center">
                <span class="material-icons-outlined text-${color}" style="font-size: 22px;">${icon}</span>
            </div>
            ${delta ? `<span class="badge ${trendStyle}">
                <span class="material-icons-outlined" style="font-size:11px;">${trendIcon}</span>
                ${delta}
            </span>` : ''}
        </div>
        <div class="relative">
            <div class="text-[10px] text-on-surface-muted uppercase tracking-[0.15em] font-semibold mb-1.5">${label}</div>
            <div class="flex items-baseline gap-2">
                <div class="text-3xl font-display font-extrabold tracking-tight counter">${value}</div>
                ${sub ? `<div class="text-xs text-on-surface-muted">${sub}</div>` : ''}
            </div>
        </div>
    </div>`;
}

function statusBadge(status) {
    const styles = {
        running: 'bg-accent-success/10 text-accent-success',
        idle: 'bg-surface-4 text-on-surface-muted',
        error: 'bg-accent-error/10 text-accent-error',
    };
    const dot = status === 'running' ? '<span class="relative w-1.5 h-1.5 rounded-full bg-accent-success dot-running"></span>'
        : `<span class="w-1.5 h-1.5 rounded-full bg-current"></span>`;
    return `<span class="badge ${styles[status] || styles.idle}">${dot} ${status}</span>`;
}

function toggle(v) {
    return v
        ? '<span class="badge bg-accent-success/10 text-accent-success"><span class="w-1 h-1 rounded-full bg-accent-success"></span>On</span>'
        : '<span class="badge bg-surface-4 text-on-surface-muted"><span class="w-1 h-1 rounded-full bg-on-surface-subtle"></span>Off</span>';
}

function emptyState(icon, text) {
    return `<div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-surface-3/50 flex items-center justify-center mb-4">
            <span class="material-icons-outlined text-on-surface-muted" style="font-size: 28px;">${icon}</span>
        </div>
        <p class="text-sm text-on-surface-muted">${text}</p>
    </div>`;
}

function btnPrimary(label, onclick, icon = 'add') {
    return `<button onclick='${onclick}' class="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
        <span class="material-icons-outlined" style="font-size: 18px;">${icon}</span>${label}
    </button>`;
}

function btnSecondary(label, onclick, icon = '') {
    return `<button onclick='${onclick}' class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-surface-3/60 hover:bg-surface-4 border border-outline/30 transition">
        ${icon ? `<span class="material-icons-outlined" style="font-size: 18px;">${icon}</span>` : ''}${label}
    </button>`;
}

// ==================== Dashboard ====================
async function renderDashboard() {
    const [projects, articles] = await Promise.all([Api.getProjects(), Api.getArticles()]);
    const total = articles.length;
    const relevant = articles.filter(a => a.is_relevant).length;
    const relevantPct = total ? Math.round((relevant / total) * 100) : 0;
    const running = projects.filter(p => p.run_status === 'running').length;
    const avgScore = total ? Math.round(articles.reduce((s, a) => s + (a.relevance_score || 0), 0) / total) : 0;

    const byProject = {};
    articles.forEach(a => byProject[a.project_name] = (byProject[a.project_name] || 0) + 1);

    const projectRows = await Promise.all(projects.map(async p => {
        const [agents, tasks, sources] = await Promise.all([
            Api.getAgents(p.project_name), Api.getTasks(p.project_name), Api.getSources(p.project_name)
        ]);
        return { ...p, agents_count: agents.length, tasks_count: tasks.length, sources_count: sources.length };
    }));

    // 7-day data (simulated)
    const days = [];
    const dailyCounts = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        dailyCounts.push(Math.floor(Math.random() * 20) + 5);
    }

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    app.innerHTML = `
    <!-- Hero -->
    <div class="relative mb-10 overflow-hidden">
        <div class="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-br from-primary/10 via-tertiary/5 to-transparent rounded-full blur-3xl -z-10"></div>

        <div class="flex items-baseline justify-between mb-3">
            <div class="text-xs text-on-surface-muted uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                <span class="w-1 h-1 rounded-full bg-primary"></span>
                ${today}
            </div>
            <div class="flex items-center gap-2 text-xs text-on-surface-muted">
                <span class="relative w-1.5 h-1.5 rounded-full bg-accent-success dot-running"></span>
                <span>System operational</span>
            </div>
        </div>

        <h1 class="font-display text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05] mb-4">
            ${greeting},<br>
            <span class="text-gradient counter">${total}</span> articles today.
        </h1>
        <p class="text-on-surface-muted text-base max-w-2xl">
            ${relevant} classified as relevant across ${projects.length} active projects.
            ${running > 0 ? `<span class="text-accent-success">${running} workflow currently running.</span>` : 'All workflows idle.'}
        </p>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        ${kpiCard({ icon: 'feed', label: 'Total Articles', value: total, delta: '+12%', trend: 'up', color: 'primary' })}
        ${kpiCard({ icon: 'auto_awesome', label: 'Relevant', value: relevant, delta: '+8%', trend: 'up', color: 'tertiary' })}
        ${kpiCard({ icon: 'speed', label: 'Avg. Score', value: avgScore + '%', delta: '-2%', trend: 'down', color: 'secondary' })}
        ${kpiCard({ icon: 'bolt', label: 'Active Runs', value: running, sub: `${projects.length - running} idle`, color: 'accent-success' })}
    </div>

    <!-- Charts grid -->
    <div class="grid grid-cols-3 gap-5 mb-8">
        <div class="col-span-2 bg-surface-2/60 rounded-2xl p-6 card-glow-top">
            <div class="flex items-start justify-between mb-5">
                <div>
                    <h3 class="font-display font-bold text-lg">Article Volume · 7 days</h3>
                    <p class="text-xs text-on-surface-muted mt-0.5">Daily processing across all projects</p>
                </div>
                <div class="flex gap-2 text-xs">
                    <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">7D</button>
                    <button class="px-3 py-1.5 rounded-lg text-on-surface-muted hover:bg-surface-3">30D</button>
                    <button class="px-3 py-1.5 rounded-lg text-on-surface-muted hover:bg-surface-3">90D</button>
                </div>
            </div>
            <div class="relative" style="height: 240px;">
                <canvas id="chartDaily"></canvas>
            </div>
        </div>
        <div class="bg-surface-2/60 rounded-2xl p-6 card-glow-top flex flex-col">
            <div class="mb-4">
                <h3 class="font-display font-bold text-lg">Relevance</h3>
                <p class="text-xs text-on-surface-muted mt-0.5">Classification split</p>
            </div>
            <div class="relative flex-1 flex items-center justify-center" style="min-height: 180px;">
                <canvas id="chartRelevance"></canvas>
                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div class="font-display text-4xl font-extrabold text-gradient">${relevantPct}%</div>
                    <div class="text-[10px] text-on-surface-muted uppercase tracking-[0.15em] mt-1">Relevant</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-outline/20">
                <div>
                    <div class="flex items-center gap-1.5 text-xs text-on-surface-muted"><span class="w-2 h-2 rounded-full bg-primary"></span>Relevant</div>
                    <div class="font-mono font-bold text-sm mt-0.5">${relevant}</div>
                </div>
                <div>
                    <div class="flex items-center gap-1.5 text-xs text-on-surface-muted"><span class="w-2 h-2 rounded-full bg-surface-4"></span>Irrelevant</div>
                    <div class="font-mono font-bold text-sm mt-0.5">${total - relevant}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Per-project chart + Activity -->
    <div class="grid grid-cols-3 gap-5 mb-8">
        <div class="col-span-2 bg-surface-2/60 rounded-2xl p-6 card-glow-top">
            <div class="flex items-baseline justify-between mb-5">
                <div>
                    <h3 class="font-display font-bold text-lg">By Project</h3>
                    <p class="text-xs text-on-surface-muted mt-0.5">Article distribution per project</p>
                </div>
            </div>
            <div class="relative" style="height: 260px;">
                <canvas id="chartProjects"></canvas>
            </div>
        </div>
        <div class="bg-surface-2/60 rounded-2xl p-6 card-glow-top">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 class="font-display font-bold text-lg">Activity</h3>
                    <p class="text-xs text-on-surface-muted mt-0.5">Recent events</p>
                </div>
                <span class="badge bg-accent-success/10 text-accent-success">Live</span>
            </div>
            <div class="space-y-3">
                ${[
                    { icon: 'play_arrow', color: 'accent-success', text: '<strong>legal_task</strong> started', time: '2m ago' },
                    { icon: 'check_circle', color: 'primary', text: '12 articles classified', time: '5m ago' },
                    { icon: 'mail', color: 'tertiary', text: 'Report emailed', time: '14m ago' },
                    { icon: 'schedule', color: 'secondary', text: 'Scheduler reloaded', time: '1h ago' },
                    { icon: 'person_add', color: 'accent-warning', text: 'User <strong>editor@co</strong> added', time: '3h ago' },
                ].map(e => `
                    <div class="flex items-start gap-3">
                        <div class="w-7 h-7 rounded-lg bg-${e.color}/10 flex items-center justify-center flex-shrink-0">
                            <span class="material-icons-outlined text-${e.color}" style="font-size:14px;">${e.icon}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs">${e.text}</div>
                            <div class="text-[10px] text-on-surface-muted mt-0.5">${e.time}</div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>
    </div>

    <!-- Projects grid -->
    ${sectionHeader('Projects', `${projects.length} configured workflows`)}
    <div class="grid grid-cols-3 gap-5 mb-10">
        ${projectRows.map(p => `
            <a href="#project?name=${p.project_name}" class="card-hover bg-surface-2/60 rounded-2xl p-6 block group card-glow-top">
                <div class="flex items-start justify-between mb-5">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center">
                            <span class="material-icons-outlined text-primary" style="font-size: 22px;">folder_special</span>
                        </div>
                        <div>
                            <div class="font-semibold">${p.project_name}</div>
                            <div class="text-xs text-on-surface-muted mt-0.5">v${p.version}</div>
                        </div>
                    </div>
                    ${statusBadge(p.run_status)}
                </div>

                <p class="text-xs text-on-surface-muted mb-5 line-clamp-2">${p.metadata.description || '—'}</p>

                <div class="grid grid-cols-3 gap-3 mb-5">
                    <div class="text-center bg-surface-3/40 rounded-lg py-2.5">
                        <div class="text-lg font-bold">${p.agents_count}</div>
                        <div class="text-[10px] text-on-surface-muted uppercase tracking-wider">Agents</div>
                    </div>
                    <div class="text-center bg-surface-3/40 rounded-lg py-2.5">
                        <div class="text-lg font-bold">${p.tasks_count}</div>
                        <div class="text-[10px] text-on-surface-muted uppercase tracking-wider">Tasks</div>
                    </div>
                    <div class="text-center bg-surface-3/40 rounded-lg py-2.5">
                        <div class="text-lg font-bold">${p.sources_count}</div>
                        <div class="text-[10px] text-on-surface-muted uppercase tracking-wider">Sources</div>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs">
                    ${p.require_approval
                        ? '<span class="text-primary flex items-center gap-1"><span class="material-icons-outlined" style="font-size:14px;">verified_user</span> Manual approval</span>'
                        : '<span class="text-on-surface-muted flex items-center gap-1"><span class="material-icons-outlined" style="font-size:14px;">bolt</span> Auto</span>'}
                    <span class="text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">Manage <span class="material-icons-outlined" style="font-size:14px;">arrow_forward</span></span>
                </div>
            </a>`).join('')}
    </div>

    <!-- Latest articles -->
    ${sectionHeader('Latest Articles', 'Most recent items across all projects')}
    <div class="bg-surface-2/60 rounded-2xl overflow-hidden card-glow-top">
        ${articles.slice(0, 5).map(a => `
            <div class="flex items-start gap-4 p-5 data-row border-b border-outline/20 last:border-0">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.is_relevant ? 'bg-primary/10' : 'bg-surface-3/50'}">
                    <span class="material-icons-outlined ${a.is_relevant ? 'text-primary' : 'text-on-surface-muted'}" style="font-size: 20px;">${a.is_relevant ? 'check_circle' : 'radio_button_unchecked'}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium mb-1">${a.title}</div>
                    <div class="flex items-center gap-3 text-xs text-on-surface-muted">
                        <span class="font-mono">${a.project_name}</span>
                        <span>·</span>
                        <span>${a.published_at_vn}</span>
                    </div>
                </div>
                <div class="flex items-center gap-4 flex-shrink-0">
                    <div class="text-right">
                        <div class="font-bold text-sm">${a.relevance_score}</div>
                        <div class="text-[10px] text-on-surface-muted uppercase">Score</div>
                    </div>
                    <div class="w-24 h-1.5 bg-surface-4 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all" style="width: ${a.relevance_score}%; background: linear-gradient(90deg, var(--primary), var(--tertiary));"></div>
                    </div>
                </div>
            </div>`).join('')}
    </div>`;

    // Daily line chart
    new Chart(document.getElementById('chartDaily'), {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Articles',
                data: dailyCounts,
                borderColor: '#85adff',
                backgroundColor: (c) => {
                    const g = c.chart.ctx.createLinearGradient(0, 0, 0, 180);
                    g.addColorStop(0, 'rgba(133, 173, 255, 0.35)');
                    g.addColorStop(1, 'rgba(133, 173, 255, 0)');
                    return g;
                },
                fill: true, tension: 0.42, borderWidth: 2.5,
                pointRadius: 4, pointHoverRadius: 6,
                pointBackgroundColor: '#85adff', pointBorderColor: '#060e20', pointBorderWidth: 2,
            }],
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#091328', borderColor: '#2a3352', borderWidth: 1, padding: 12 } },
            scales: {
                y: { ticks: { color: '#7b86a8', font: { size: 10 } }, grid: { color: 'rgba(42, 51, 82, 0.2)' }, beginAtZero: true },
                x: { ticks: { color: '#7b86a8', font: { size: 10 } }, grid: { display: false } },
            },
        },
    });

    // Project bar chart
    new Chart(document.getElementById('chartProjects'), {
        type: 'bar',
        data: {
            labels: Object.keys(byProject),
            datasets: [{
                data: Object.values(byProject),
                backgroundColor: (ctx) => {
                    const c = ctx.chart.ctx.createLinearGradient(0, 0, 0, 140);
                    c.addColorStop(0, 'rgba(172, 138, 255, 0.8)');
                    c.addColorStop(1, 'rgba(133, 173, 255, 0.2)');
                    return c;
                },
                borderRadius: 8, borderSkipped: false, barPercentage: 0.6,
            }],
        },
        options: {
            maintainAspectRatio: false, indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#091328' } },
            scales: {
                x: { ticks: { color: '#7b86a8', font: { size: 11 } }, grid: { color: 'rgba(42, 51, 82, 0.3)' }, beginAtZero: true },
                y: { ticks: { color: '#7b86a8', font: { size: 11 } }, grid: { display: false } },
            },
        },
    });

    // Relevance doughnut
    new Chart(document.getElementById('chartRelevance'), {
        type: 'doughnut',
        data: {
            labels: ['Relevant', 'Irrelevant'],
            datasets: [{
                data: [relevant, total - relevant],
                backgroundColor: ['#85adff', '#192540'],
                borderWidth: 0, borderRadius: 8, spacing: 4,
            }],
        },
        options: {
            cutout: '72%', maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
    });
}

// ==================== Admin — Mock data ====================
const MOCK_ADMIN = {
    users: [
        { id: 1, email: 'admin@synthetica.com',  name: 'Trần Admin',      role: 'admin',  lastSeen: 'Just now',   status: 'active' },
        { id: 2, email: 'legal@synthetica.com',  name: 'Legal Manager',   role: 'editor', lastSeen: '2h ago',     status: 'active' },
        { id: 3, email: 'analyst@synthetica.com', name: 'Data Analyst',   role: 'viewer', lastSeen: '1d ago',     status: 'active' },
        { id: 4, email: 'ops@synthetica.com',    name: 'Ops Lead',        role: 'editor', lastSeen: '3d ago',     status: 'inactive' },
    ],
    llm: [
        { id: 1, provider: 'OpenRouter', model: 'google/gemini-2.0-flash-exp:free', status: 'active',   usage: 420, limit: 1000 },
        { id: 2, provider: 'Ollama',     model: 'llama3.2:1b',                      status: 'active',   usage: null, limit: null },
        { id: 3, provider: 'OpenAI',     model: 'gpt-4o-mini',                      status: 'inactive', usage: 0,   limit: null },
    ],
    integrations: [
        { id: 1, name: 'SMTP',        type: 'email',       status: 'connected', icon: 'mail' },
        { id: 2, name: 'Slack',       type: 'notification', status: 'disconnected', icon: 'chat' },
        { id: 3, name: 'Webhook',     type: 'webhook',     status: 'connected', icon: 'webhook' },
        { id: 4, name: 'Google Drive', type: 'storage',    status: 'disconnected', icon: 'cloud' },
    ],
    audit: [
        { ts: '2026-04-23 10:32', user: 'admin@syn', action: 'agent.update',    target: 'legal_task/classifier',  ip: '192.168.1.5' },
        { ts: '2026-04-23 10:15', user: 'admin@syn', action: 'scheduler.reload', target: '—',                     ip: '192.168.1.5' },
        { ts: '2026-04-23 09:48', user: 'legal@syn', action: 'article.approve', target: '#128',                   ip: '10.0.0.12' },
        { ts: '2026-04-23 09:30', user: 'admin@syn', action: 'user.add',        target: 'analyst@syn',            ip: '192.168.1.5' },
        { ts: '2026-04-22 17:20', user: 'admin@syn', action: 'llm.configure',   target: 'openrouter',             ip: '192.168.1.5' },
        { ts: '2026-04-22 15:05', user: 'ops@syn',   action: 'project.create',  target: 'er_task',                ip: '10.0.0.8' },
    ],
};

// ==================== Admin — General Settings ====================
function renderAdminGeneral() {
    app.innerHTML = `
    ${pageHeader('General Settings', 'System-wide configuration')}

    <div class="grid grid-cols-3 gap-5">
        <div class="col-span-2 space-y-5">
            <div class="bg-surface-2/60 rounded-2xl p-6 card-glow-top">
                ${sectionHeader('Organization', 'Brand and identity')}
                <div class="space-y-4">
                    <div>
                        <label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">Organization Name</label>
                        <input value="Synthetica News Intelligence" class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30">
                    </div>
                    <div>
                        <label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">Support Email</label>
                        <input value="support@synthetica.com" class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30">
                    </div>
                    <div>
                        <label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">Timezone</label>
                        <select class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30">
                            <option>Asia/Ho_Chi_Minh (UTC+07:00)</option>
                            <option>UTC</option>
                            <option>America/New_York</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="bg-surface-2/60 rounded-2xl p-6 card-glow-top">
                ${sectionHeader('Defaults', 'Applied when creating a new project')}
                <div class="space-y-4">
                    ${toggleRow('Require approval', 'Articles need admin approval before publishing.', true)}
                    ${toggleRow('Auto-translate to all languages', 'Run translation crew on every relevant article.', true)}
                    ${toggleRow('Send email digest', 'Daily summary at 8 AM to subscribers.', false)}
                    ${toggleRow('Store original HTML', 'Keep raw HTML of every crawled article.', false)}
                </div>
            </div>
        </div>

        <div class="space-y-5">
            <div class="bg-surface-2/60 rounded-2xl p-6 card-glow-top">
                ${sectionHeader('System', 'Runtime info')}
                <div class="space-y-3 text-xs">
                    ${systemInfoRow('Version', '0.1.0')}
                    ${systemInfoRow('Environment', 'Production')}
                    ${systemInfoRow('Uptime', '14d 6h 42m')}
                    ${systemInfoRow('Database', 'MySQL 8.0')}
                    ${systemInfoRow('Scheduler', '<span class="text-accent-success">Running</span>')}
                </div>
            </div>
            <div class="bg-gradient-to-br from-surface-2/60 to-tertiary/5 border border-tertiary/20 rounded-2xl p-6">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-icons-outlined text-tertiary">info</span>
                    <h3 class="font-display font-bold">Need help?</h3>
                </div>
                <p class="text-sm text-on-surface-muted mb-4">Check our documentation or contact support.</p>
                <button class="btn-primary px-4 py-2 rounded-lg text-xs w-full">View Docs</button>
            </div>
        </div>
    </div>`;
}

function toggleRow(title, desc, checked) {
    return `<div class="flex items-start justify-between gap-4 p-3 bg-surface-3/30 rounded-xl">
        <div>
            <div class="text-sm font-medium">${title}</div>
            <div class="text-xs text-on-surface-muted mt-0.5">${desc}</div>
        </div>
        <label class="relative inline-flex cursor-pointer flex-shrink-0">
            <input type="checkbox" ${checked ? 'checked' : ''} class="sr-only peer">
            <div class="w-11 h-6 bg-surface-4 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-primary-dim transition-all relative">
                <div class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-on-surface-muted peer-checked:bg-canvas transition-all peer-checked:translate-x-5"></div>
            </div>
        </label>
    </div>`;
}

function systemInfoRow(label, value) {
    return `<div class="flex justify-between items-center py-2 border-b border-outline/20 last:border-0">
        <span class="text-on-surface-muted">${label}</span>
        <span class="font-mono">${value}</span>
    </div>`;
}

// ==================== Admin — Users ====================
function renderAdminUsers() {
    const users = MOCK_ADMIN.users;
    app.innerHTML = `
    ${pageHeader('Users & Roles', `${users.length} users · Manage access across all projects`, btnPrimary('Invite User', "alert('Mock: invite user')", 'person_add'))}

    <div class="grid grid-cols-4 gap-4 mb-6">
        ${kpiCard({ icon: 'group', label: 'Total Users', value: users.length, color: 'primary' })}
        ${kpiCard({ icon: 'shield', label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: 'tertiary' })}
        ${kpiCard({ icon: 'edit', label: 'Editors', value: users.filter(u => u.role === 'editor').length, color: 'secondary' })}
        ${kpiCard({ icon: 'check_circle', label: 'Active', value: users.filter(u => u.status === 'active').length, color: 'accent-success' })}
    </div>

    <div class="bg-surface-2/60 rounded-2xl overflow-hidden card-glow-top">
        <table class="w-full text-sm">
            <thead class="text-left text-on-surface-muted text-[10px] uppercase tracking-[0.15em] bg-surface-3/30">
                <tr>
                    <th class="px-6 py-3.5">User</th>
                    <th>Role</th>
                    <th>Last Seen</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => {
                    const initials = u.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                    const roleStyle = {
                        admin:  'bg-tertiary/15 text-tertiary',
                        editor: 'bg-primary/15 text-primary',
                        viewer: 'bg-surface-4 text-on-surface-muted',
                    }[u.role];
                    return `<tr class="border-t border-outline/20 data-row">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-tertiary/30 flex items-center justify-center text-xs font-bold">${initials}</div>
                                <div>
                                    <div class="font-medium">${u.name}</div>
                                    <div class="text-xs text-on-surface-muted">${u.email}</div>
                                </div>
                            </div>
                        </td>
                        <td><span class="badge ${roleStyle}">${u.role}</span></td>
                        <td class="text-xs text-on-surface-muted">${u.lastSeen}</td>
                        <td>
                            <span class="badge ${u.status === 'active' ? 'bg-accent-success/10 text-accent-success' : 'bg-surface-4 text-on-surface-muted'}">
                                <span class="w-1 h-1 rounded-full bg-current"></span>${u.status}
                            </span>
                        </td>
                        <td class="px-6">
                            <button onclick="alert('Mock: edit ${u.email}')" class="text-primary hover:underline text-xs">Edit</button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// ==================== Admin — LLM Providers ====================
function renderAdminLlm() {
    const llms = MOCK_ADMIN.llm;
    app.innerHTML = `
    ${pageHeader('LLM Providers', 'Configure AI model providers', btnPrimary('Add Provider', "alert('Mock')", 'add'))}

    <div class="grid grid-cols-3 gap-5 mb-6">
        ${llms.map(l => {
            const usagePct = l.limit ? Math.round((l.usage / l.limit) * 100) : 0;
            const icon = l.provider === 'OpenAI' ? 'psychology' : l.provider === 'Ollama' ? 'memory' : 'hub';
            return `<div class="bg-surface-2/60 rounded-2xl p-6 card-glow-top card-hover">
                <div class="flex items-start justify-between mb-4">
                    <div class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span class="material-icons-outlined text-primary" style="font-size: 22px;">${icon}</span>
                    </div>
                    <span class="badge ${l.status === 'active' ? 'bg-accent-success/10 text-accent-success' : 'bg-surface-4 text-on-surface-muted'}">
                        <span class="w-1 h-1 rounded-full bg-current"></span>${l.status}
                    </span>
                </div>
                <div class="text-xs text-on-surface-muted uppercase tracking-wider mb-1">${l.provider}</div>
                <div class="font-display font-bold text-lg mb-4 font-mono">${l.model}</div>

                ${l.limit ? `
                <div class="mb-3">
                    <div class="flex items-center justify-between text-xs mb-2">
                        <span class="text-on-surface-muted">Daily Usage</span>
                        <span class="font-mono"><strong>${l.usage}</strong> / ${l.limit}</span>
                    </div>
                    <div class="h-1.5 bg-surface-4 rounded-full overflow-hidden">
                        <div class="h-full rounded-full ${usagePct > 80 ? 'bg-accent-error' : 'bg-gradient-to-r from-primary to-tertiary'}" style="width: ${usagePct}%"></div>
                    </div>
                </div>` : `<div class="text-xs text-on-surface-muted mb-3">No usage limit (self-hosted)</div>`}

                <button onclick="alert('Mock: configure ${l.provider}')" class="w-full mt-2 text-xs py-2 rounded-lg bg-surface-3/60 hover:bg-surface-4 transition">Configure</button>
            </div>`;
        }).join('')}
    </div>`;
}

// ==================== Admin — Integrations ====================
function renderAdminIntegrations() {
    const intgs = MOCK_ADMIN.integrations;
    app.innerHTML = `
    ${pageHeader('Integrations', 'Connect external services')}

    <div class="grid grid-cols-2 xl:grid-cols-3 gap-5">
        ${intgs.map(i => `
            <div class="bg-surface-2/60 rounded-2xl p-5 card-glow-top card-hover">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                            <span class="material-icons-outlined text-secondary" style="font-size: 20px;">${i.icon}</span>
                        </div>
                        <div>
                            <div class="font-semibold">${i.name}</div>
                            <div class="text-[10px] text-on-surface-muted uppercase tracking-wider">${i.type}</div>
                        </div>
                    </div>
                    <span class="badge ${i.status === 'connected' ? 'bg-accent-success/10 text-accent-success' : 'bg-surface-4 text-on-surface-muted'}">
                        <span class="w-1 h-1 rounded-full bg-current"></span>${i.status}
                    </span>
                </div>
                <button onclick="alert('Mock: configure ${i.name}')" class="w-full text-xs py-2 rounded-lg ${i.status === 'connected' ? 'bg-surface-3/60 hover:bg-surface-4' : 'btn-primary'} transition">
                    ${i.status === 'connected' ? 'Manage' : 'Connect'}
                </button>
            </div>`).join('')}
    </div>`;
}

// ==================== Admin — Audit Log ====================
function renderAdminAudit() {
    const logs = MOCK_ADMIN.audit;
    app.innerHTML = `
    ${pageHeader('Audit Log', 'System activity and changes')}

    <div class="bg-surface-2/60 rounded-2xl overflow-hidden card-glow-top">
        <div class="p-4 border-b border-outline/20 flex items-center gap-3">
            <span class="material-icons-outlined text-on-surface-muted" style="font-size: 18px;">search</span>
            <input type="text" placeholder="Search logs..." class="flex-1 bg-transparent outline-none text-sm">
            <button class="text-xs text-on-surface-muted hover:text-on-surface flex items-center gap-1">
                <span class="material-icons-outlined" style="font-size: 14px;">filter_list</span> Filter
            </button>
            <button class="text-xs text-on-surface-muted hover:text-on-surface flex items-center gap-1">
                <span class="material-icons-outlined" style="font-size: 14px;">download</span> Export
            </button>
        </div>
        <table class="w-full text-sm">
            <thead class="text-left text-on-surface-muted text-[10px] uppercase tracking-[0.15em] bg-surface-3/30">
                <tr>
                    <th class="px-6 py-3.5">Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>IP Address</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(l => `
                    <tr class="border-t border-outline/20 data-row">
                        <td class="px-6 py-3.5 font-mono text-xs text-on-surface-muted">${l.ts}</td>
                        <td class="text-xs">${l.user}</td>
                        <td><code class="text-xs font-mono text-primary">${l.action}</code></td>
                        <td class="text-xs font-mono text-on-surface-muted">${l.target}</td>
                        <td class="text-xs font-mono text-on-surface-muted">${l.ip}</td>
                    </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

// ==================== Project ====================
async function renderProject(name, tab) {
    const project = await Api.getProject(name);
    if (!project) {
        app.innerHTML = `<div class="bg-accent-error/10 border border-accent-error/20 text-accent-error rounded-2xl p-6">
            <div class="font-semibold mb-1">Project not found</div>
            <div class="text-sm opacity-80">No project matches "${name}"</div>
        </div>`;
        return;
    }

    const [emails, access, sources, schedulers] = await Promise.all([
        Api.getEmails(name), Api.getAccess(name), Api.getSources(name), Api.getSchedulers(name),
    ]);

    const tabs = [
        { key: 'agents', label: 'Agents', icon: 'smart_toy', count: project.agents.length },
        { key: 'tasks', label: 'Tasks', icon: 'checklist', count: project.tasks.length },
        { key: 'sources', label: 'Sources', icon: 'language', count: sources.length },
        { key: 'schedulers', label: 'Schedulers', icon: 'schedule', count: schedulers.length },
        { key: 'emails', label: 'Emails', icon: 'mail', count: emails.length },
        { key: 'access', label: 'Access', icon: 'admin_panel_settings', count: access.length },
    ];

    app.innerHTML = `
    <!-- Project header -->
    <div class="flex items-start justify-between mb-10">
        <div class="flex items-start gap-5">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center flex-shrink-0">
                <span class="material-icons-outlined text-primary" style="font-size: 28px;">folder_special</span>
            </div>
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <h1 class="font-display text-3xl font-extrabold tracking-tight">${project.project_name}</h1>
                    ${statusBadge(project.run_status)}
                </div>
                <p class="text-on-surface-muted">${project.metadata.description || '—'}</p>
                <div class="flex items-center gap-4 mt-3 text-xs text-on-surface-muted">
                    <span class="flex items-center gap-1"><span class="material-icons-outlined" style="font-size:14px;">commit</span>v${project.version}</span>
                    <span>·</span>
                    <span class="flex items-center gap-1"><span class="material-icons-outlined" style="font-size:14px;">group</span>${project.metadata.owner || '—'}</span>
                    <span>·</span>
                    <span class="flex items-center gap-1">
                        ${project.require_approval ? '<span class="material-icons-outlined text-primary" style="font-size:14px;">verified_user</span>Manual approval' : '<span class="material-icons-outlined" style="font-size:14px;">bolt</span>Auto-approve'}
                    </span>
                </div>
            </div>
        </div>
        <div class="flex gap-2">
            ${btnSecondary('Run Now', "alert('Mock: run workflow')", 'play_arrow')}
        </div>
    </div>

    <!-- Tabs -->
    <div class="mb-8 border-b border-outline/30">
        <div class="flex gap-2 overflow-x-auto">
            ${tabs.map(t => `
                <a href="#project?name=${name}&tab=${t.key}"
                   class="tab-item ${tab === t.key ? 'active' : 'text-on-surface-muted'} px-5 py-4 text-sm flex items-center gap-2 whitespace-nowrap font-medium">
                    <span class="material-icons-outlined" style="font-size: 18px;">${t.icon}</span>
                    ${t.label}
                    ${t.count ? `<span class="px-1.5 py-0.5 rounded-md bg-surface-4 text-[10px] font-mono">${t.count}</span>` : ''}
                </a>`).join('')}
        </div>
    </div>

    <div id="tab-content" class="animate-slide-in"></div>`;

    const tc = document.getElementById('tab-content');
    switch (tab) {
        case 'agents':     renderAgents(tc, project.agents, name); break;
        case 'tasks':      renderTasks(tc, project.tasks, project.agents, name); break;
        case 'sources':    renderSources(tc, sources, name); break;
        case 'schedulers': renderSchedulers(tc, schedulers, name); break;
        case 'emails':     renderEmails(tc, emails, project.tasks, name); break;
        case 'access':     renderAccess(tc, access, name); break;
    }
}

// ==================== Agents ====================
function renderAgents(el, agents, projectName) {
    el.innerHTML = `
    ${sectionHeader('Agents', 'AI agents powering this workflow', btnPrimary('New Agent', `openAgentModal("${projectName}")`))}
    ${agents.length === 0 ? emptyState('smart_toy', 'No agents yet. Add your first agent to get started.') : `
    <div class="grid grid-cols-2 gap-4">
        ${agents.map(a => `
            <div class="card-hover bg-surface-2/60 rounded-2xl p-5 card-glow-top">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
                            <span class="material-icons-outlined text-tertiary" style="font-size: 20px;">smart_toy</span>
                        </div>
                        <div>
                            <div class="font-mono text-sm font-medium">${a.agent_key}</div>
                            <div class="text-xs text-on-surface-muted">${a.role}</div>
                        </div>
                    </div>
                    ${toggle(a.enabled)}
                </div>
                <p class="text-xs text-on-surface-muted mb-3 line-clamp-2">${a.goal}</p>
                <div class="flex items-center justify-between text-xs pt-3 border-t border-outline/30">
                    <span class="font-mono text-on-surface-muted truncate max-w-[70%]">${a.llm || '—'}</span>
                    <button onclick='openAgentModal("${projectName}", ${JSON.stringify(a)})' class="text-primary hover:underline">Edit</button>
                </div>
            </div>`).join('')}
    </div>`}`;
}

// ==================== Tasks ====================
function renderTasks(el, tasks, agents, projectName) {
    const agentOpts = agents.map(a => `<option value="${a.agent_key}">${a.agent_key} — ${a.role}</option>`).join('');
    el.innerHTML = `
    ${sectionHeader('Tasks', 'Work each agent performs', btnPrimary('New Task', `openTaskModal("${projectName}", null, \`${agentOpts.replace(/`/g, '\\`')}\`)`))}

    ${tasks.length === 0 ? emptyState('checklist', 'No tasks yet.') : `
    <div class="space-y-3 mb-5">
        ${tasks.map(t => `
            <div class="card-hover bg-surface-2/60 rounded-2xl p-5 card-glow-top">
                <div class="flex items-start justify-between">
                    <div class="flex items-start gap-4 flex-1 min-w-0">
                        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span class="material-icons-outlined text-primary" style="font-size: 20px;">checklist</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-3 mb-1">
                                <div class="font-mono text-sm font-medium">${t.task_key}</div>
                                ${toggle(t.enabled)}
                            </div>
                            <div class="text-xs text-on-surface-muted mb-2">→ agent <code class="text-primary">${t.agent_key}</code>${(t.context_task_keys || []).length ? ` · after <code class="text-tertiary">${(t.context_task_keys||[]).join(', ')}</code>` : ''}</div>
                            <p class="text-sm text-on-surface/90 line-clamp-2">${t.description}</p>
                        </div>
                    </div>
                    <button onclick='openTaskModal("${projectName}", ${JSON.stringify(t)}, \`${agentOpts.replace(/`/g, '\\`')}\`)' class="text-primary hover:underline text-xs flex-shrink-0 ml-4">Edit</button>
                </div>
            </div>`).join('')}
    </div>`}

    <div class="bg-gradient-to-br from-surface-2/40 to-tertiary/5 border border-tertiary/20 rounded-2xl p-5">
        <div class="flex items-center gap-2 mb-3">
            <span class="material-icons-outlined text-tertiary" style="font-size: 18px;">tips_and_updates</span>
            <span class="text-sm font-semibold">Template Variables</span>
        </div>
        <div class="flex flex-wrap gap-2">
            ${['source_language', 'target_language', 'article_title', 'article_content', 'title', 'summary', 'content', 'analysis', 'recommendation'].map(v => `<code class="bg-surface-3/60 text-tertiary px-2 py-1 rounded text-xs font-mono">{${v}}</code>`).join('')}
        </div>
    </div>`;
}

// ==================== Sources ====================
function renderSources(el, sources, projectName) {
    el.innerHTML = `
    ${sectionHeader('News Sources', `Sites crawled for <code class="text-primary font-mono text-sm">${projectName}</code>`, btnPrimary('New Source', `openSourceModal("${projectName}")`))}
    ${sources.length === 0 ? emptyState('language', 'No sources assigned yet.') : `
    <div class="grid grid-cols-2 gap-4">
        ${sources.map(s => `
            <div class="card-hover bg-surface-2/60 rounded-2xl p-5 card-glow-top">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span class="material-icons-outlined text-primary" style="font-size: 20px;">language</span>
                        </div>
                        <div>
                            <div class="font-medium">${s.name}</div>
                            <div class="text-xs text-on-surface-muted font-mono">${s.domain}</div>
                        </div>
                    </div>
                    ${toggle(s.active)}
                </div>
                <div class="flex items-center gap-3 text-xs">
                    <span class="badge bg-surface-3/60 text-on-surface-muted">${s.language}</span>
                    <span class="badge bg-tertiary/10 text-tertiary">${s.fetch_method}</span>
                    <button onclick='openSourceModal("${projectName}", ${JSON.stringify(s)})' class="ml-auto text-primary hover:underline">Edit</button>
                </div>
            </div>`).join('')}
    </div>`}`;
}

// ==================== Schedulers ====================
function renderSchedulers(el, schedulers, projectName) {
    el.innerHTML = `
    ${sectionHeader('Schedulers', `Cron jobs for <code class="text-primary font-mono text-sm">${projectName}</code>`, btnPrimary('New Job', `openSchedulerModal("${projectName}")`))}
    ${schedulers.length === 0 ? emptyState('schedule', 'No scheduled jobs.') : `
    <div class="space-y-3">
        ${schedulers.map(j => `
            <div class="card-hover bg-surface-2/60 rounded-2xl p-5 card-glow-top flex items-center gap-5">
                <div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <span class="material-icons-outlined text-secondary" style="font-size: 20px;">schedule</span>
                </div>
                <div class="flex-1">
                    <div class="font-mono font-medium">${j.job_id}</div>
                    <div class="text-xs text-on-surface-muted mt-1">${j.trigger_type} · <span class="font-mono">${JSON.stringify(j.trigger_args)}</span> · ${j.timezone}</div>
                </div>
                ${toggle(j.enabled)}
                <button onclick='openSchedulerModal("${projectName}", ${JSON.stringify(j)})' class="text-primary hover:underline text-xs">Edit</button>
            </div>`).join('')}
    </div>`}`;
}

// ==================== Emails ====================
function renderEmails(el, emails, tasks, projectName) {
    const byTask = {};
    emails.forEach(e => { (byTask[e.task_key] = byTask[e.task_key] || []).push(e); });

    el.innerHTML = `
    ${sectionHeader('Email Recipients', 'Who gets notified when each task completes')}
    <div class="space-y-4">
    ${tasks.map(t => {
        const list = byTask[t.task_key] || [];
        return `<div class="bg-surface-2/60 rounded-2xl p-5 card-glow-top">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span class="material-icons-outlined text-primary" style="font-size: 18px;">checklist</span>
                    </div>
                    <div>
                        <div class="font-mono font-medium text-sm">${t.task_key}</div>
                        <div class="text-xs text-on-surface-muted mt-0.5">via ${t.agent_key}</div>
                    </div>
                </div>
                <button onclick='openEmailModal("${projectName}", "${t.task_key}")' class="text-primary text-sm hover:underline flex items-center gap-1">
                    <span class="material-icons-outlined" style="font-size: 16px;">add</span> Add
                </button>
            </div>
            ${list.length === 0 ? '<div class="text-xs text-on-surface-muted pl-12">No recipients configured</div>' :
                `<div class="grid grid-cols-2 gap-2 pl-12">${list.map(r => {
                    const icons = { user: 'person', group: 'group', department: 'business' };
                    const colors = { user: 'text-primary bg-primary/10', group: 'text-tertiary bg-tertiary/10', department: 'text-secondary bg-secondary/10' };
                    return `<div class="flex items-center gap-3 bg-surface-3/40 px-3 py-2.5 rounded-xl">
                        <div class="w-8 h-8 rounded-lg ${colors[r.recipient_type]} flex items-center justify-center flex-shrink-0">
                            <span class="material-icons-outlined" style="font-size: 16px;">${icons[r.recipient_type] || 'mail'}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm truncate">${r.email}</div>
                            <div class="text-[10px] text-on-surface-muted uppercase tracking-wider">${r.recipient_type}</div>
                        </div>
                        <button onclick='removeEmailRecipient(${r.id})' class="text-on-surface-muted hover:text-accent-error">
                            <span class="material-icons-outlined" style="font-size: 16px;">close</span>
                        </button>
                    </div>`;
                }).join('')}</div>`}
        </div>`;
    }).join('')}
    </div>`;
}

// ==================== Access ====================
function renderAccess(el, users, projectName) {
    el.innerHTML = `
    ${sectionHeader('Access Control', 'Who can view or modify this project', btnPrimary('Grant Access', `openAccessModal("${projectName}")`))}

    <div class="bg-surface-2/60 rounded-2xl p-5 mb-4 card-glow-top">
        <div class="flex items-center gap-2 mb-4">
            <span class="material-icons-outlined text-primary">verified_user</span>
            <span class="font-semibold">Project Visibility</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <label class="cursor-pointer bg-surface-3/40 hover:bg-surface-4 p-4 rounded-xl border border-primary/40 transition">
                <div class="flex items-center gap-3">
                    <input type="radio" name="visibility" value="private" class="accent-primary" checked>
                    <div>
                        <div class="font-medium text-sm">Private</div>
                        <div class="text-xs text-on-surface-muted">Only granted users</div>
                    </div>
                </div>
            </label>
            <label class="cursor-pointer bg-surface-3/40 hover:bg-surface-4 p-4 rounded-xl border border-transparent transition">
                <div class="flex items-center gap-3">
                    <input type="radio" name="visibility" value="public" class="accent-primary">
                    <div>
                        <div class="font-medium text-sm">Public</div>
                        <div class="text-xs text-on-surface-muted">All admins can access</div>
                    </div>
                </div>
            </label>
        </div>
    </div>

    ${users.length === 0 ? emptyState('admin_panel_settings', 'No users granted access. Default: all admins.') : `
    <div class="space-y-2">
        ${users.map(u => {
            const roleStyle = {
                admin: 'bg-tertiary/10 text-tertiary border-tertiary/20',
                editor: 'bg-primary/10 text-primary border-primary/20',
                viewer: 'bg-surface-3 text-on-surface-muted border-outline/30'
            };
            const initials = (u.name || u.email).split(/[\s@]/).filter(Boolean).slice(0,2).map(s => s[0].toUpperCase()).join('');
            return `<div class="bg-surface-2/60 rounded-xl p-4 flex items-center gap-4 data-row">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center text-xs font-semibold">${initials}</div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium">${u.name || '—'}</div>
                    <div class="text-xs text-on-surface-muted truncate">${u.email}</div>
                </div>
                <span class="badge ${roleStyle[u.role]} border">${u.role}</span>
                <div class="text-xs text-on-surface-muted">${u.granted_at || '—'}</div>
                <button onclick='revokeUserAccess(${u.id})' class="text-on-surface-muted hover:text-accent-error">
                    <span class="material-icons-outlined" style="font-size: 18px;">close</span>
                </button>
            </div>`;
        }).join('')}
    </div>`}`;
}

// ==================== Articles ====================
async function renderArticles() {
    const articles = await Api.getArticles();

    app.innerHTML = `
    ${pageHeader('Articles', `${articles.length} articles processed across all projects`)}

    <div class="bg-surface-2/60 rounded-2xl overflow-hidden card-glow-top">
        ${articles.map(a => `
            <div class="flex items-start gap-4 p-5 data-row border-b border-outline/20 last:border-0">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.is_relevant ? 'bg-primary/10' : 'bg-surface-3/50'}">
                    <span class="material-icons-outlined ${a.is_relevant ? 'text-primary' : 'text-on-surface-muted'}" style="font-size: 20px;">${a.is_relevant ? 'check_circle' : 'radio_button_unchecked'}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium mb-1">${a.title}</div>
                    <div class="flex items-center gap-3 text-xs text-on-surface-muted">
                        <code class="font-mono">${a.project_name}</code>
                        <span>·</span>
                        <span>${a.published_at_vn}</span>
                    </div>
                </div>
                <div class="flex items-center gap-4 flex-shrink-0">
                    <div class="text-right">
                        <div class="font-bold text-sm">${a.relevance_score}</div>
                        <div class="text-[10px] text-on-surface-muted uppercase">Score</div>
                    </div>
                    <div class="w-24 h-1.5 bg-surface-4 rounded-full overflow-hidden">
                        <div class="h-full rounded-full" style="width: ${a.relevance_score}%; background: linear-gradient(90deg, var(--primary), var(--tertiary));"></div>
                    </div>
                </div>
            </div>`).join('')}
    </div>`;
}

// ==================== Modals ====================
function openAgentModal(projectName, agent) {
    const d = agent || { agent_key: '', role: '', goal: '', backstory: '', llm: '', tools: [], verbose: false, enabled: true };
    showModal(agent ? 'Edit Agent' : 'New Agent', 'smart_toy', `
        ${field('Agent Key', 'f_agent_key', d.agent_key, 'font-mono')}
        ${field('Role', 'f_role', d.role)}
        ${textarea('Goal', 'f_goal', d.goal, 3)}
        ${textarea('Backstory', 'f_backstory', d.backstory, 3)}
        ${field('LLM Model', 'f_llm', d.llm || '', 'font-mono', 'openrouter/... | ollama/... | openai/...')}
        <div class="flex gap-6 pt-2">
            ${checkbox('f_verbose', 'Verbose', d.verbose)}
            ${checkbox('f_enabled', 'Enabled', d.enabled)}
        </div>
    `, async () => {
        const payload = {
            agent_key: val('f_agent_key'), role: val('f_role'),
            goal: val('f_goal'), backstory: val('f_backstory'),
            llm: val('f_llm'), verbose: check('f_verbose'), enabled: check('f_enabled'),
        };
        await Api.saveAgent(projectName, payload, agent?.agent_key);
        alert('Agent saved (mock)\n\n' + JSON.stringify(payload, null, 2));
    });
}

function openTaskModal(projectName, task, agentOpts) {
    const d = task || { task_key: '', agent_key: '', description: '', expected_output: '', context_task_keys: [], output_key: '', enabled: true };
    showModal(task ? 'Edit Task' : 'New Task', 'checklist', `
        ${field('Task Key', 't_task_key', d.task_key, 'font-mono')}
        <div><label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">Agent</label>
             <select id="t_agent_key" class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30">${agentOpts}</select></div>
        ${textarea('Description', 't_description', d.description, 6, 'font-mono')}
        ${textarea('Expected Output', 't_expected_output', d.expected_output, 2)}
        ${field('Output Key', 't_output_key', d.output_key || '', 'font-mono')}
        ${checkbox('t_enabled', 'Enabled', d.enabled)}
    `, async () => {
        const payload = {
            task_key: val('t_task_key'), agent_key: val('t_agent_key'),
            description: val('t_description'), expected_output: val('t_expected_output'),
            output_key: val('t_output_key'), enabled: check('t_enabled'),
        };
        await Api.saveTask(projectName, payload, task?.task_key);
        alert('Task saved (mock)\n\n' + JSON.stringify(payload, null, 2));
    });
    if (d.agent_key) document.getElementById('t_agent_key').value = d.agent_key;
}

function openSourceModal(projectName, source) {
    const d = source || { site_id: '', name: '', domain: '', language: 'vi', fetch_method: 'listing', active: true };
    showModal(source ? 'Edit Source' : 'New Source', 'language', `
        ${field('Site ID', 's_site_id', d.site_id, 'font-mono')}
        ${field('Name', 's_name', d.name)}
        ${field('Domain', 's_domain', d.domain)}
        <div class="grid grid-cols-2 gap-3">
            ${select('s_language', 'Language', d.language, [['vi','Vietnamese'],['en','English'],['kr','Korean']])}
            ${select('s_fetch_method', 'Fetch Method', d.fetch_method, [['listing','Listing (CSS)'],['sitemap','Sitemap (XML)']])}
        </div>
        ${checkbox('s_active', 'Active', d.active)}
    `, async () => {
        const payload = {
            project_name: projectName,
            site_id: val('s_site_id'), name: val('s_name'), domain: val('s_domain'),
            language: val('s_language'), fetch_method: val('s_fetch_method'), active: check('s_active'),
        };
        await Api.saveSource(payload, source?.site_id);
        alert('Source saved (mock)\n\n' + JSON.stringify(payload, null, 2));
    });
}

function openSchedulerModal(projectName, job) {
    const d = job || { job_id: '', trigger_type: 'cron', trigger_args: {}, timezone: 'Asia/Ho_Chi_Minh', enabled: true };
    showModal(job ? 'Edit Scheduler Job' : 'New Scheduler Job', 'schedule', `
        ${field('Job ID', 'j_job_id', d.job_id, 'font-mono')}
        ${select('j_trigger_type', 'Trigger Type', d.trigger_type, [['cron','Cron'],['interval','Interval']])}
        ${field('Trigger Args (JSON)', 'j_trigger_args', JSON.stringify(d.trigger_args || {}), 'font-mono', '{"hour": "0,6,12", "minute": 0}')}
        ${field('Timezone', 'j_timezone', d.timezone || 'Asia/Ho_Chi_Minh')}
        ${checkbox('j_enabled', 'Enabled', d.enabled)}
    `, async () => {
        let triggerArgs;
        try { triggerArgs = JSON.parse(val('j_trigger_args')); } catch { return alert('Invalid JSON'); }
        const payload = {
            job_id: val('j_job_id'), project_name: projectName,
            trigger_type: val('j_trigger_type'), trigger_args: triggerArgs,
            timezone: val('j_timezone'), enabled: check('j_enabled'),
        };
        await Api.saveScheduler(payload, job?.job_id);
        alert('Scheduler saved (mock)\n\n' + JSON.stringify(payload, null, 2));
    });
}

function openEmailModal(projectName, taskKey) {
    showModal('Add Recipient', 'mail', `
        <div><label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">Task</label>
             <input value="${taskKey}" disabled class="w-full mt-2 bg-surface-3/40 rounded-xl px-4 py-2.5 text-sm font-mono opacity-60 border border-outline/30"></div>
        ${select('e_type', 'Recipient Type', 'user', [['user','User (single person)'],['group','Group (alias email)'],['department','Department']])}
        ${field('Email', 'e_email', '', '', 'recipient@company.com')}
        ${field('Display Name (optional)', 'e_name', '')}
    `, async () => {
        const payload = { task_key: taskKey, recipient_type: val('e_type'), email: val('e_email'), name: val('e_name') };
        await Api.addEmail(projectName, payload);
        alert('Recipient added (mock)\n\n' + JSON.stringify(payload, null, 2));
    });
}

function openAccessModal(projectName) {
    showModal('Grant Access', 'admin_panel_settings', `
        ${field('Email', 'a_email', '')}
        ${field('Name (optional)', 'a_name', '')}
        ${select('a_role', 'Role', 'viewer', [['viewer','Viewer — read only'],['editor','Editor — can modify'],['admin','Admin — full access']])}
    `, async () => {
        const payload = { email: val('a_email'), name: val('a_name'), role: val('a_role') };
        await Api.grantAccess(projectName, payload);
        alert('Access granted (mock)\n\n' + JSON.stringify(payload, null, 2));
    });
}

async function removeEmailRecipient(id) {
    if (!confirm('Remove this recipient?')) return;
    await Api.deleteEmail(id);
    alert('Mock: recipient ' + id + ' removed');
}

async function revokeUserAccess(id) {
    if (!confirm('Revoke access?')) return;
    await Api.revokeAccess(id);
    alert('Mock: access ' + id + ' revoked');
}

// ==================== Modal helpers ====================
function field(label, id, value, classes = '', placeholder = '') {
    return `<div><label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">${label}</label>
            <input id="${id}" value="${String(value).replace(/"/g, '&quot;')}" placeholder="${placeholder}"
                   class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 ${classes}"></div>`;
}
function textarea(label, id, value, rows, classes = '') {
    return `<div><label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">${label}</label>
            <textarea id="${id}" rows="${rows}" class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 ${classes}">${value}</textarea></div>`;
}
function select(id, label, value, options) {
    return `<div><label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">${label}</label>
            <select id="${id}" class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30">
                ${options.map(([v,l]) => `<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}
            </select></div>`;
}
function checkbox(id, label, checked) {
    return `<label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} class="accent-primary w-4 h-4"> ${label}</label>`;
}
function val(id) { return document.getElementById(id).value; }
function check(id) { return document.getElementById(id).checked; }

function showModal(title, icon, formHtml, onSubmit) {
    const modal = document.getElementById('modal');
    modal.innerHTML = `
    <div class="bg-surface-1/95 glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-in border border-outline/30 flex flex-col">
        <div class="p-6 border-b border-outline/30 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center">
                    <span class="material-icons-outlined text-primary" style="font-size: 20px;">${icon}</span>
                </div>
                <h3 class="font-display font-bold text-lg">${title}</h3>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg hover:bg-surface-3 flex items-center justify-center text-on-surface-muted transition">
                <span class="material-icons-outlined" style="font-size: 20px;">close</span>
            </button>
        </div>
        <div class="p-6 space-y-4 overflow-y-auto flex-1">${formHtml}</div>
        <div class="p-6 border-t border-outline/30 flex justify-end gap-3">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl text-sm bg-surface-3/60 hover:bg-surface-4 border border-outline/30 transition">Cancel</button>
            <button onclick="_modalSubmit()" class="btn-primary px-5 py-2.5 rounded-xl text-sm">Save</button>
        </div>
    </div>`;
    modal.classList.remove('hidden');
    window._modalSubmit = async () => { await onSubmit(); closeModal(); navigate(); };
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// Init
window.addEventListener('hashchange', navigate);
navigate();
