const app = document.getElementById('app');

function parseHash() {
    const hash = location.hash.slice(1) || 'dashboard';
    const [path, query] = hash.split('?');
    const params = new URLSearchParams(query || '');
    return { path, params };
}

async function navigate() {
    const { path, params } = parseHash();
    renderSidebar(path);

    app.classList.remove('animate-fade-in');
    void app.offsetWidth;
    app.classList.add('animate-fade-in');

    const main = path.split('/')[0];
    switch (main) {
        case 'dashboard':    await renderDashboard(); break;
        case 'projects':     await renderProjects(); break;
        case 'project':      await renderProject(params.get('name'), params.get('tab') || 'agents'); break;
        case 'admin-general': renderAdminGeneral(); break;
        case 'admin-users':  await renderAdminUsers(); break;
        case 'admin-audit':  renderAdminAudit(); break;
        default:             await renderDashboard();
    }
}

function renderSidebar(path) {
    // Projects & Project-detail both keep "projects" active
    document.querySelectorAll('[data-nav]').forEach(el => {
        const key = el.dataset.nav;
        const isActive = key === path || (key === 'projects' && path === 'project');
        el.classList.toggle('active', isActive);
    });

    // Async badge updates (non-blocking)
    Api.getProjects().then(ps => {
        const badge = document.getElementById('projectsBadge');
        if (badge) badge.textContent = String(ps.length).padStart(2, '0');
    }).catch(() => {});
    Api.getUsers().then(us => {
        const badge = document.getElementById('usersBadge');
        if (badge) badge.textContent = String(us.length).padStart(2, '0');
    }).catch(() => {});
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

// ==================== Projects page ====================
async function renderProjects() {
    app.innerHTML = `<div class="flex items-center justify-center py-20 text-on-surface-muted">
        <span class="material-icons-outlined animate-spin mr-3">refresh</span> Loading…
    </div>`;

    const projects = await Api.getProjects();
    const rows = await Promise.all(projects.map(async p => {
        const [agents, tasks, sources] = await Promise.all([
            Api.getAgents(p.project_name),
            Api.getTasks(p.project_name),
            Api.getSources(p.project_name),
        ]);
        return { ...p, agents_count: agents.length, tasks_count: tasks.length, sources_count: sources.length };
    }));

    app.innerHTML = `
    ${pageHeader('Projects', `${projects.length} configured workflows`,
        btnPrimary('New Project', 'openProjectModal()', 'add')
    )}
    ${rows.length === 0 ? emptyState('folder_special', 'No projects yet. Create your first project.') : `
    <div class="grid grid-cols-3 gap-5">
        ${rows.map(p => `
        <div class="card-hover bg-surface-2/60 rounded-2xl p-6 block group card-glow-top flex flex-col">
            <div class="flex items-start justify-between mb-5">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center">
                        <span class="material-icons-outlined text-primary" style="font-size: 22px;">folder_special</span>
                    </div>
                    <div>
                        <div class="font-semibold">${(p.metadata && p.metadata.name) ? p.metadata.name : p.project_name}</div>
                        <div class="text-[11px] text-on-surface-muted mt-0.5 font-mono">${p.project_name} · v${p.version}</div>
                    </div>
                </div>
                ${statusBadge(p.run_status)}
            </div>

            <p class="text-xs text-on-surface-muted mb-5 line-clamp-2 flex-1">${(p.metadata && p.metadata.description) || '—'}</p>

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

            <div class="flex items-center justify-between pt-4 border-t border-outline/20">
                <span class="text-xs text-on-surface-muted">${p.require_approval ? '🔒 Manual approval' : '⚡ Auto-approve'}</span>
                <div class="flex items-center gap-2">
                    <button onclick='openProjectEditModal(${JSON.stringify(p).replace(/'/g,"&#39;")})' class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-surface-3/60 hover:bg-surface-4 border border-outline/30 transition">
                        <span class="material-icons-outlined" style="font-size:14px;">edit</span> Edit
                    </button>
                    <button onclick="openProjectManageModal('${p.project_name}')" class="btn-primary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                        Manage <span class="material-icons-outlined" style="font-size:14px;">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>`).join('')}
    </div>`}`;
}

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

// ==================== Admin — Users & Access ====================
async function renderAdminUsers() {
    app.innerHTML = `<div class="flex items-center justify-center py-20 text-on-surface-muted">
        <span class="material-icons-outlined animate-spin mr-3">refresh</span> Loading…
    </div>`;

    const users = await Api.getUsers();

    const statusBadgeUser = s => s === 'active'
        ? `<span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-success/10 text-accent-success border border-accent-success/20"><span class="w-1.5 h-1.5 rounded-full bg-accent-success"></span>Active</span>`
        : `<span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-3 text-on-surface-muted border border-outline/30"><span class="w-1.5 h-1.5 rounded-full bg-on-surface-muted"></span>${s || 'inactive'}</span>`;

    app.innerHTML = `
    ${pageHeader('Users & Access', `${users.length} users`, btnPrimary('New User', 'openUserModal()', 'person_add'))}

    <div class="bg-surface-2/60 rounded-2xl overflow-hidden card-glow-top">
        <div class="overflow-x-auto">
        <table class="w-full text-sm">
            <thead class="text-left text-on-surface-muted text-[10px] uppercase tracking-[0.15em] bg-surface-3/30 border-b border-outline/20">
                <tr>
                    <th class="px-5 py-3.5 font-semibold">ID</th>
                    <th class="px-5 py-3.5 font-semibold">Knox ID</th>
                    <th class="px-5 py-3.5 font-semibold">Full Name</th>
                    <th class="px-5 py-3.5 font-semibold">Department</th>
                    <th class="px-5 py-3.5 font-semibold">Group</th>
                    <th class="px-5 py-3.5 font-semibold">Team</th>
                    <th class="px-5 py-3.5 font-semibold">Status</th>
                    <th class="px-5 py-3.5 font-semibold">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.length === 0
                    ? `<tr><td colspan="8" class="px-5 py-16 text-center text-on-surface-muted text-sm">Chưa có user nào.</td></tr>`
                    : users.map(u => `
                <tr class="border-t border-outline/20 data-row hover:bg-surface-3/20 transition">
                    <td class="px-5 py-3.5 font-mono text-xs text-on-surface-muted">#${u.id}</td>
                    <td class="px-5 py-3.5 font-mono text-sm font-medium">${u.knoxid || '—'}</td>
                    <td class="px-5 py-3.5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-tertiary/30 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                ${(u.name || u.knoxid || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <span class="font-medium">${u.name || '—'}</span>
                        </div>
                    </td>
                    <td class="px-5 py-3.5 text-xs text-on-surface-muted">${u.department || '—'}</td>
                    <td class="px-5 py-3.5 text-xs text-on-surface-muted">${u.group_name || '—'}</td>
                    <td class="px-5 py-3.5 text-xs text-on-surface-muted">${u.team || '—'}</td>
                    <td class="px-5 py-3.5">${statusBadgeUser(u.status)}</td>
                    <td class="px-5 py-3.5">
                        <div class="flex items-center gap-3">
                            <button onclick='openUserModal(${JSON.stringify(u).replace(/'/g,"&#39;")})' class="text-primary hover:underline text-xs font-medium">Edit</button>
                            <button onclick='confirmDeleteUser(${u.id})' class="text-accent-error hover:underline text-xs font-medium">Xóa</button>
                        </div>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
        </div>
    </div>`;
}

function openUserModal(user) {
    const d = user || { id: null, knoxid: '', name: '', department: '', group_name: '', team: '', role: 'viewer', status: 'active' };
    showModal(user ? 'Edit User' : 'New User', 'person', `
        ${field('Knox ID', 'u_knoxid', d.knoxid || '', 'font-mono', 'e.g. nhantt')}
        ${field('Full Name', 'u_name', d.name || '')}
        <div class="grid grid-cols-3 gap-3">
            ${field('Department', 'u_dept', d.department || '', '', 'e.g. Legal')}
            ${field('Group', 'u_group', d.group_name || '', '', 'e.g. Compliance')}
            ${field('Team', 'u_team', d.team || '', '', 'e.g. Risk')}
        </div>
        ${select('u_status', 'Status', d.status || 'active', [['active','Active'],['inactive','Inactive']])}
    `, async () => {
        const knoxid = val('u_knoxid').trim();
        if (!knoxid) throw new Error('Knox ID là bắt buộc');
        const payload = {
            email: knoxid,
            name: val('u_name'),
            department: val('u_dept'),
            group_name: val('u_group'),
            team: val('u_team'),
            status: val('u_status'),
        };
        await Api.saveUser(payload, d.id);
        await renderAdminUsers();
    });
}

async function confirmDeleteUser(id) {
    if (!confirm('Delete this user? This will also remove all their project access.')) return;
    await Api.deleteUser(id);
    await renderAdminUsers();
}

function openGrantAccessModal(projectName, users) {
    showModal(`Grant Access — ${projectName}`, 'admin_panel_settings', `
        <div>
            <label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">User</label>
            <select id="ga_user_id" class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30">
                ${users.map(u => `<option value="${u.id}">${u.name} (${u.email})</option>`).join('')}
            </select>
        </div>
        ${select('ga_role', 'Role', 'viewer', [['viewer','Viewer — read only'],['editor','Editor — can modify'],['admin','Admin — full access']])}
    `, async () => {
        await Api.grantAccess(projectName, { user_id: parseInt(val('ga_user_id')), role: val('ga_role') });
        await renderAdminUsers();
    });
}

async function revokeProjectAccess(projectName, accessId) {
    if (!confirm('Revoke this user\'s access?')) return;
    await Api.revokeAccess(projectName, accessId);
    await renderAdminUsers();
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
        { key: 'agents',     label: 'Agents',     icon: 'smart_toy',          count: project.agents.length },
        { key: 'tasks',      label: 'Tasks',       icon: 'checklist',          count: project.tasks.length },
        { key: 'sources',    label: 'Sources',     icon: 'language',           count: sources.length },
        { key: 'schedulers', label: 'Schedulers',  icon: 'schedule',           count: schedulers.length },
        { key: 'emails',     label: 'Emails',      icon: 'mail',               count: emails.length },
        { key: 'access',     label: 'Access',      icon: 'admin_panel_settings', count: access.length },
        { key: 'logs',       label: 'Logs',        icon: 'terminal',           count: null },
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
        case 'logs':       renderLogs(tc, name, project.agents); break;
    }
}

// ==================== Agents ====================
function renderAgents(el, agents, projectName) {
    el.innerHTML = `
    ${sectionHeader('Agents', 'AI agents powering this workflow')}
    ${agents.length === 0 ? emptyState('smart_toy', 'No agents configured.') : `
    <div class="grid grid-cols-3 gap-4">
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
    ${sectionHeader('Tasks', 'Work each agent performs')}
    ${tasks.length === 0 ? emptyState('checklist', 'No tasks yet.') : `
    <div class="grid grid-cols-3 gap-4">
        ${tasks.map(t => `
            <div class="card-hover bg-surface-2/60 rounded-2xl p-5 card-glow-top flex flex-col gap-3">
                <div class="flex items-start justify-between">
                    <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span class="material-icons-outlined text-primary" style="font-size: 20px;">checklist</span>
                    </div>
                    ${toggle(t.enabled)}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-mono text-sm font-semibold mb-1">${t.task_key}</div>
                    <div class="text-xs text-on-surface-muted mb-2">→ <code class="text-primary">${t.agent_key}</code>${(t.context_task_keys || []).length ? `<br>after <code class="text-tertiary">${(t.context_task_keys||[]).join(', ')}</code>` : ''}</div>
                    <p class="text-xs text-on-surface/80 line-clamp-3">${t.description}</p>
                </div>
                <div class="border-t border-outline/20 pt-3 flex justify-end">
                    <button onclick='openTaskModal("${projectName}", ${JSON.stringify(t)}, \`${agentOpts.replace(/`/g, '\\`')}\`)' class="text-primary hover:underline text-xs">Edit</button>
                </div>
            </div>`).join('')}
    </div>`}`;
}

// ==================== Sources ====================
function renderSources(el, sources, projectName) {
    el.innerHTML = `
    ${sectionHeader('News Sources', `Sites crawled for <code class="text-primary font-mono text-sm">${projectName}</code>`, btnPrimary('New Source', `openSourceModal("${projectName}")`))}
    ${sources.length === 0 ? emptyState('language', 'No sources assigned yet.') : `
    <div class="grid grid-cols-3 gap-4">
        ${sources.map(s => `
            <div class="ui-card ui-card-hover ui-card-glow flex flex-col">
                <div class="ui-card-header">
                    <div class="ui-card-icon"><span class="material-icons-outlined">language</span></div>
                    <div class="flex-1 min-w-0">
                        <div class="ui-card-title truncate">${s.name || '—'}</div>
                        <div class="ui-card-subtitle truncate">${s.domain || '—'}</div>
                    </div>
                    ${toggle(s.active)}
                </div>
                <div class="ui-card-body text-xs font-mono truncate text-on-surface-muted mb-2" title="${s.latest_page_url || ''}">${s.latest_page_url || '—'}</div>
                <div class="flex flex-wrap gap-1.5 mb-1">
                    <span class="badge bg-surface-3/60 text-on-surface-muted text-[10px]">${s.language || 'vi'}</span>
                    ${s.listing_selector ? `<span class="badge bg-tertiary/10 text-tertiary text-[10px]" title="${s.listing_selector}">CSS list</span>` : ''}
                    ${s.content_selector ? `<span class="badge bg-primary/10 text-primary text-[10px]" title="${s.content_selector}">CSS content</span>` : ''}
                </div>
                <div class="ui-card-footer mt-auto">
                    <span class="text-[11px] text-on-surface-muted font-mono truncate max-w-[70%]">${s.site_id || '—'}</span>
                    <button onclick='openSourceModal("${projectName}", ${JSON.stringify(s).replace(/'/g,"&#39;")})' class="ui-btn ui-btn-ghost ui-btn-sm text-primary">Edit</button>
                </div>
            </div>`).join('')}
    </div>`}`;
}

// ==================== Schedulers ====================
function renderSchedulers(el, schedulers, projectName) {
    el.innerHTML = `
    ${sectionHeader('Schedulers', `Cron jobs for <code class="text-primary font-mono text-sm">${projectName}</code>`, btnPrimary('New Job', `openSchedulerModal("${projectName}")`))}
    ${schedulers.length === 0 ? emptyState('schedule', 'No scheduled jobs.') : `
    <div class="grid grid-cols-3 gap-4">
        ${schedulers.map(j => `
            <div class="card-hover bg-surface-2/60 rounded-2xl p-5 card-glow-top flex flex-col gap-3">
                <div class="flex items-center justify-between">
                    <div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <span class="material-icons-outlined text-secondary" style="font-size: 20px;">schedule</span>
                    </div>
                    ${toggle(j.enabled)}
                </div>
                <div>
                    <div class="font-mono font-medium text-sm">${j.job_id}</div>
                    <div class="text-xs text-on-surface-muted mt-1 capitalize">${j.trigger_type}</div>
                </div>
                <div class="text-[11px] font-mono bg-surface-3/40 rounded-lg px-3 py-2 text-on-surface-muted break-all">${JSON.stringify(j.trigger_args)}</div>
                <div class="flex items-center justify-between pt-2 border-t border-outline/20">
                    <span class="text-[11px] text-on-surface-muted">${j.timezone}</span>
                    <button onclick='openSchedulerModal("${projectName}", ${JSON.stringify(j)})' class="text-primary hover:underline text-xs">Edit</button>
                </div>
            </div>`).join('')}
    </div>`}`;
}

// ==================== Emails ====================
function renderEmails(el, emails, tasks, projectName) {
    el.innerHTML = `
    ${sectionHeader('Email Recipients', 'Danh sách Knox ID nhận thông báo của project',
        `<button onclick='openEmailModal("${projectName}")' class="btn-primary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
            <span class="material-icons-outlined" style="font-size:14px;">add</span> Add
        </button>`
    )}
    ${emails.length === 0 ? emptyState('mail', 'Chưa có người nhận nào được cấu hình.') : `
    <div class="bg-surface-2/60 rounded-2xl overflow-hidden card-glow-top">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b border-outline/30 text-left text-xs text-on-surface-muted uppercase tracking-wider">
                    <th class="px-5 py-3">Knox ID</th>
                    <th class="px-5 py-3">Tên</th>
                    <th class="px-5 py-3"></th>
                </tr>
            </thead>
            <tbody>
                ${emails.map(r => `
                <tr class="border-t border-outline/20 data-row">
                    <td class="px-5 py-3 font-mono text-xs font-medium">${r.email || '—'}</td>
                    <td class="px-5 py-3 text-xs text-on-surface-muted">${r.name || '—'}</td>
                    <td class="px-5 py-3 text-right">
                        <button onclick='removeEmailRecipient("${projectName}", ${r.id})' class="text-on-surface-muted hover:text-accent-error">
                            <span class="material-icons-outlined" style="font-size:16px;">close</span>
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`}`;
}

// ==================== Access ====================
function renderAccess(el, users, projectName) {
    const roleStyle = {
        admin:  'bg-tertiary/10 text-tertiary border-tertiary/20',
        editor: 'bg-primary/10 text-primary border-primary/20',
        viewer: 'bg-surface-3 text-on-surface-muted border-outline/30',
    };

    el.innerHTML = `
    ${sectionHeader('Access Control', 'Knox ID có quyền truy cập project này',
        btnPrimary('Grant Access', `openAccessModal("${projectName}")`)
    )}

    ${users.length === 0 ? emptyState('admin_panel_settings', 'Chưa có ai được cấp quyền.') : `
    <div class="bg-surface-2/60 rounded-2xl overflow-hidden card-glow-top">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b border-outline/30 text-left text-xs text-on-surface-muted uppercase tracking-wider">
                    <th class="px-5 py-3">Knox ID</th>
                    <th class="px-5 py-3">Tên</th>
                    <th class="px-5 py-3">Trạng thái</th>
                    <th class="px-5 py-3">Role</th>
                    <th class="px-5 py-3">Ngày thêm</th>
                    <th class="px-5 py-3">Người thêm</th>
                    <th class="px-5 py-3"></th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                <tr class="border-t border-outline/20 data-row">
                    <td class="px-5 py-3 font-mono text-xs font-medium">${u.knoxid || u.email || '—'}</td>
                    <td class="px-5 py-3 text-xs">${u.name || '—'}</td>
                    <td class="px-5 py-3">
                        <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border
                            ${u.status === 'active' ? 'bg-accent-success/10 text-accent-success border-accent-success/20' : 'bg-surface-3 text-on-surface-muted border-outline/30'}">
                            <span class="w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-accent-success' : 'bg-on-surface-muted'}"></span>
                            ${u.status || 'active'}
                        </span>
                    </td>
                    <td class="px-5 py-3"><span class="badge ${roleStyle[u.role]} border text-[11px]">${u.role}</span></td>
                    <td class="px-5 py-3 text-xs text-on-surface-muted">${(u.granted_at || '').replace('T', ' ').slice(0, 16)}</td>
                    <td class="px-5 py-3 text-xs text-on-surface-muted">System</td>
                    <td class="px-5 py-3 text-right">
                        <button onclick='revokeUserAccess("${projectName}", ${u.id})' class="text-on-surface-muted hover:text-accent-error">
                            <span class="material-icons-outlined" style="font-size:16px;">close</span>
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
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

// ==================== Logs ====================
async function renderLogs(el, projectName, agents) {
    el.innerHTML = `<div class="flex items-center justify-center py-12 text-on-surface-muted">
        <span class="material-icons-outlined animate-spin mr-2">refresh</span> Loading logs…
    </div>`;

    // filter state
    let filterAgent  = '';
    let filterStatus = '';

    async function load() {
        const logs = await Api.getLogs(projectName, {
            agent_key: filterAgent  || undefined,
            status:    filterStatus || undefined,
            limit:     200,
        });

        const statusStyle = {
            running:   'bg-accent-success/10 text-accent-success',
            success:   'bg-primary/10 text-primary',
            error:     'bg-accent-error/10 text-accent-error',
            cancelled: 'bg-surface-4 text-on-surface-muted',
        };
        const statusDot = {
            running:   '<span class="relative w-1.5 h-1.5 rounded-full bg-accent-success dot-running"></span>',
            success:   '<span class="w-1.5 h-1.5 rounded-full bg-primary"></span>',
            error:     '<span class="w-1.5 h-1.5 rounded-full bg-accent-error"></span>',
            cancelled: '<span class="w-1.5 h-1.5 rounded-full bg-on-surface-subtle"></span>',
        };

        const agentOpts = ['<option value="">All agents</option>']
            .concat(agents.map(a => `<option value="${a.agent_key}" ${filterAgent === a.agent_key ? 'selected' : ''}>${a.agent_key}</option>`))
            .join('');
        const statusOpts = [
            '<option value="">All status</option>',
            `<option value="running"   ${filterStatus==='running'   ? 'selected':''}>Running</option>`,
            `<option value="success"   ${filterStatus==='success'   ? 'selected':''}>Success</option>`,
            `<option value="error"     ${filterStatus==='error'     ? 'selected':''}>Error</option>`,
            `<option value="cancelled" ${filterStatus==='cancelled' ? 'selected':''}>Cancelled</option>`,
        ].join('');

        el.innerHTML = `
        ${sectionHeader('Agent Run Logs', `${logs.length} entries · most recent first`)}

        <!-- Filters -->
        <div class="flex items-center gap-3 mb-5">
            <select id="log_agent" class="bg-surface-3/60 rounded-xl px-3 py-2 text-sm border border-outline/30 font-mono">
                ${agentOpts}
            </select>
            <select id="log_status" class="bg-surface-3/60 rounded-xl px-3 py-2 text-sm border border-outline/30">
                ${statusOpts}
            </select>
            <button onclick="_logApplyFilter()" class="px-4 py-2 rounded-xl text-sm bg-surface-3/60 hover:bg-surface-4 border border-outline/30 transition flex items-center gap-1">
                <span class="material-icons-outlined" style="font-size:16px;">filter_list</span> Filter
            </button>
            <button onclick="_logRefresh()" class="px-4 py-2 rounded-xl text-sm bg-surface-3/60 hover:bg-surface-4 border border-outline/30 transition flex items-center gap-1">
                <span class="material-icons-outlined" style="font-size:16px;">refresh</span> Refresh
            </button>
        </div>

        ${logs.length === 0 ? emptyState('terminal', 'No logs yet for this project.') : `
        <div class="bg-surface-2/60 rounded-2xl overflow-hidden card-glow-top">
            <table class="w-full text-sm">
                <thead class="text-left text-on-surface-muted text-[10px] uppercase tracking-[0.15em] bg-surface-3/30">
                    <tr>
                        <th class="px-5 py-3">Agent</th>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Duration</th>
                        <th>Preview</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(l => {
                        const dur = l.duration_ms != null
                            ? (l.duration_ms >= 60000
                                ? Math.round(l.duration_ms / 60000) + 'm ' + Math.round((l.duration_ms % 60000) / 1000) + 's'
                                : (l.duration_ms / 1000).toFixed(1) + 's')
                            : '—';
                        const preview = l.log_preview
                            ? l.log_preview.replace(/</g,'&lt;').replace(/>/g,'&gt;').substring(0, 80) + (l.log_preview.length >= 80 ? '…' : '')
                            : (l.error_msg ? `<span class="text-accent-error">${l.error_msg.substring(0,80)}</span>` : '—');
                        return `<tr class="border-t border-outline/20 data-row">
                            <td class="px-5 py-3">
                                <code class="text-xs font-mono text-tertiary">${l.agent_key}</code>
                            </td>
                            <td class="text-xs font-mono text-on-surface-muted">${l.task_key || '—'}</td>
                            <td>
                                <span class="badge ${statusStyle[l.status] || 'bg-surface-4 text-on-surface-muted'}">
                                    ${statusDot[l.status] || ''} ${l.status}
                                </span>
                            </td>
                            <td class="text-xs text-on-surface-muted whitespace-nowrap">${l.started_at || '—'}</td>
                            <td class="text-xs font-mono text-on-surface-muted">${dur}</td>
                            <td class="text-xs text-on-surface-muted max-w-xs truncate">${preview}</td>
                            <td class="px-4">
                                <div class="flex items-center gap-3">
                                    <button onclick='_logView("${projectName}", ${l.id})' class="text-primary hover:underline text-xs">View</button>
                                    <button onclick='_logDelete("${projectName}", ${l.id})' class="text-accent-error hover:underline text-xs">Del</button>
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`}`;

        // bind filter helpers in closure
        window._logApplyFilter = function() {
            filterAgent  = document.getElementById('log_agent').value;
            filterStatus = document.getElementById('log_status').value;
            load();
        };
        window._logRefresh = load;
    }

    window._logView = async function(proj, id) {
        const log = await Api.getLog(proj, id);
        showModal('Log Detail — ' + log.agent_key, 'terminal', `
            <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div class="bg-surface-3/40 rounded-lg p-3">
                    <div class="text-on-surface-muted uppercase tracking-wider mb-1">Agent</div>
                    <code class="text-tertiary font-mono">${log.agent_key}</code>
                </div>
                <div class="bg-surface-3/40 rounded-lg p-3">
                    <div class="text-on-surface-muted uppercase tracking-wider mb-1">Task</div>
                    <code class="font-mono">${log.task_key || '—'}</code>
                </div>
                <div class="bg-surface-3/40 rounded-lg p-3">
                    <div class="text-on-surface-muted uppercase tracking-wider mb-1">Status</div>
                    <span>${log.status}</span>
                </div>
                <div class="bg-surface-3/40 rounded-lg p-3">
                    <div class="text-on-surface-muted uppercase tracking-wider mb-1">Duration</div>
                    <span>${log.duration_ms != null ? (log.duration_ms/1000).toFixed(2)+'s' : '—'}</span>
                </div>
            </div>
            ${log.error_msg ? `<div class="bg-accent-error/10 border border-accent-error/20 rounded-xl p-3 mb-3 text-xs text-accent-error font-mono whitespace-pre-wrap">${log.error_msg}</div>` : ''}
            <div class="text-xs text-on-surface-muted uppercase tracking-wider mb-2">Log Output</div>
            <pre class="bg-canvas/80 rounded-xl p-4 text-xs font-mono text-on-surface overflow-auto max-h-80 whitespace-pre-wrap">${(log.log_text || '(empty)').replace(/</g,'&lt;')}</pre>
        `, () => {});
        // remove Save button for view-only
        document.querySelector('#modal button[onclick="_modalSubmit()"]').style.display = 'none';
    };

    window._logDelete = async function(proj, id) {
        if (!confirm('Delete this log entry?')) return;
        await Api.deleteLog(proj, id);
        load();
    };

    window._logAdd = function(proj) {
        const agentOpts2 = agents.map(a => `<option value="${a.agent_key}">${a.agent_key}</option>`).join('');
        showModal('Add Log Entry', 'terminal', `
            <div><label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">Agent</label>
                 <select id="nl_agent" class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono">${agentOpts2}</select></div>
            ${field('Task Key', 'nl_task', '', 'font-mono')}
            ${field('Run ID (optional)', 'nl_run_id', '', 'font-mono')}
            ${select('nl_status', 'Status', 'success', [['running','Running'],['success','Success'],['error','Error'],['cancelled','Cancelled']])}
            ${field('Duration (ms)', 'nl_dur', '', 'font-mono', '3500')}
            <div><label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">Log Text</label>
                 <textarea id="nl_log" rows="5" class="w-full mt-2 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono"></textarea></div>
            ${field('Error Message', 'nl_err', '')}
        `, async () => {
            await Api.createLog(proj, {
                agent_key:   val('nl_agent'),
                task_key:    val('nl_task'),
                run_id:      val('nl_run_id'),
                status:      val('nl_status'),
                duration_ms: val('nl_dur') ? parseInt(val('nl_dur')) : null,
                log_text:    val('nl_log'),
                error_msg:   val('nl_err'),
            });
            load();
        });
    };

    await load();
}

// ==================== Modals ====================
function openAgentModal(projectName, agent) {
    const d = agent || { agent_key: '', role: '', goal: '', backstory: '', llm: '', tools: [], verbose: false, enabled: true };
    showModal(agent ? 'Edit Agent' : 'New Agent', 'smart_toy', `
        ${field('Agent Name', 'f_agent_key', d.agent_key, 'font-mono')}
        ${field('Role', 'f_role', d.role)}
        ${textarea('Goal', 'f_goal', d.goal, 3)}
        ${textarea('Backstory', 'f_backstory', d.backstory, 3)}
        ${field('LLM Model', 'f_llm', d.llm || '', 'font-mono', 'openrouter/... | ollama/... | openai/...')}
        <div class="flex gap-6 pt-2">
            ${checkbox('f_verbose', 'Verbose', d.verbose)}
        </div>
    `, async () => {
        const payload = {
            agent_key: val('f_agent_key'), role: val('f_role'),
            goal: val('f_goal'), backstory: val('f_backstory'),
            llm: val('f_llm'), verbose: check('f_verbose'),
        };
        await Api.saveAgent(projectName, payload, agent?.agent_key);
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
    });
    if (d.agent_key) document.getElementById('t_agent_key').value = d.agent_key;
}

function openSourceModal(projectName, source) {
    const d = source || { site_id: '', name: '', latest_page_url: '', domain: '', language: 'vi', listing_selector: '', content_selector: '', article_url_pattern: '', active: true };
    const siteIdRow = source
        ? `<div class="flex items-center gap-3 p-3 bg-surface-3/30 rounded-xl">
               <span class="material-icons-outlined text-on-surface-muted" style="font-size:16px;">tag</span>
               <div>
                   <div class="font-mono text-sm font-medium">${d.site_id}</div>
                   <div class="text-xs text-on-surface-muted">Site ID — tự động tạo, không thể thay đổi</div>
               </div>
           </div>`
        : '';
    showModal(source ? 'Edit Source' : 'New Source', 'language', `
        ${siteIdRow}
        ${field('Name', 's_name', d.name, '', 'Tên trang')}
        ${field('Listing URL', 's_url', d.latest_page_url, 'font-mono', 'https://example.com/tin-moi.htm')}
        ${field('Domain', 's_domain', d.domain, 'font-mono', 'example.com')}
        ${select('s_language', 'Language', d.language, [['vi','Vietnamese'],['en','English'],['ko','Korean']])}
        ${field('Listing Selector (CSS)', 's_listing_sel', d.listing_selector, 'font-mono', 'div.article-list a')}
        ${field('Content Selector (CSS)', 's_content_sel', d.content_selector, 'font-mono', 'div.article-body')}
        ${field('URL Pattern (regex)', 's_url_pattern', d.article_url_pattern, 'font-mono', '-\\\\d+\\\\.htm$')}
        ${checkbox('s_active', 'Active', d.active)}
    `, async () => {
        const payload = {
            project_name: projectName,
            name: val('s_name'),
            latest_page_url: val('s_url'),
            domain: val('s_domain'),
            language: val('s_language'),
            listing_selector: val('s_listing_sel'),
            content_selector: val('s_content_sel'),
            article_url_pattern: val('s_url_pattern'),
            active: check('s_active'),
        };
        await Api.saveSource(payload, source ? source.site_id : null);
    });
}

function openSchedulerModal(projectName, job) {
    const d    = job || { job_id: '', trigger_type: 'cron', trigger_args: {}, timezone: 'Asia/Ho_Chi_Minh', enabled: true };
    const args = d.trigger_args || {};
    const isCron = d.trigger_type !== 'interval';

    const cronMinute = args.minute  !== undefined ? args.minute  : '0';
    const cronHour   = args.hour    !== undefined ? args.hour    : '8';
    const cronDow    = args.day_of_week !== undefined ? args.day_of_week : '*';
    const cronDom    = args.day     !== undefined ? args.day     : '*';
    const intHours   = args.hours   !== undefined ? args.hours   : '';
    const intMins    = args.minutes !== undefined ? args.minutes : '30';
    const intSecs    = args.seconds !== undefined ? args.seconds : '';

    showModal(job ? 'Edit Scheduler' : 'New Scheduler', 'schedule', `
        ${job ? `<div class="flex items-center gap-2 p-3 bg-surface-3/30 rounded-xl mb-1">
            <span class="material-icons-outlined text-on-surface-muted" style="font-size:16px;">tag</span>
            <span class="font-mono text-sm font-medium">${d.job_id}</span>
            <span class="text-xs text-on-surface-muted ml-1">Job ID (auto-assigned)</span>
        </div>` : ''}
        ${select('j_trigger_type', 'Trigger Type', d.trigger_type, [['cron','Cron (lịch cố định)'],['interval','Interval (lặp đều)']])}

        <div id="j_cron_wrap" class="${isCron ? '' : 'hidden'}">
            <div class="text-xs text-on-surface-muted uppercase tracking-wider font-semibold mb-2 mt-1">Lịch Cron</div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="text-xs text-on-surface-muted font-semibold uppercase tracking-wider">Phút</label>
                    <input id="j_c_min" value="${cronMinute}" placeholder="0" class="w-full mt-1.5 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono">
                    <div class="text-[10px] text-on-surface-muted mt-1">0–59 · <code>*/15</code> = mỗi 15 phút</div>
                </div>
                <div>
                    <label class="text-xs text-on-surface-muted font-semibold uppercase tracking-wider">Giờ</label>
                    <input id="j_c_hr" value="${cronHour}" placeholder="8" class="w-full mt-1.5 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono">
                    <div class="text-[10px] text-on-surface-muted mt-1">0–23 · <code>0,6,12,18</code> = 4 lần/ngày</div>
                </div>
                <div>
                    <label class="text-xs text-on-surface-muted font-semibold uppercase tracking-wider">Ngày trong tuần</label>
                    <select id="j_c_dow" class="w-full mt-1.5 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30">
                        <option value="*"        ${cronDow==='*'        ?'selected':''}>Mỗi ngày</option>
                        <option value="mon-fri"  ${cronDow==='mon-fri'  ?'selected':''}>Thứ 2 – 6 (Weekday)</option>
                        <option value="sat,sun"  ${cronDow==='sat,sun'  ?'selected':''}>Thứ 7 + CN (Weekend)</option>
                        <option value="mon"      ${cronDow==='mon'      ?'selected':''}>Chỉ thứ 2</option>
                    </select>
                </div>
                <div>
                    <label class="text-xs text-on-surface-muted font-semibold uppercase tracking-wider">Ngày trong tháng</label>
                    <input id="j_c_dom" value="${cronDom}" placeholder="*" class="w-full mt-1.5 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono">
                    <div class="text-[10px] text-on-surface-muted mt-1">* = mọi ngày · 1 = ngày đầu tháng</div>
                </div>
            </div>
        </div>

        <div id="j_int_wrap" class="${isCron ? 'hidden' : ''}">
            <div class="text-xs text-on-surface-muted uppercase tracking-wider font-semibold mb-2 mt-1">Lặp mỗi…</div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="text-xs text-on-surface-muted font-semibold uppercase tracking-wider">Giờ</label>
                    <input id="j_i_hr"  value="${intHours}" placeholder="0"  class="w-full mt-1.5 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono">
                </div>
                <div>
                    <label class="text-xs text-on-surface-muted font-semibold uppercase tracking-wider">Phút</label>
                    <input id="j_i_min" value="${intMins}"  placeholder="30" class="w-full mt-1.5 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono">
                </div>
                <div>
                    <label class="text-xs text-on-surface-muted font-semibold uppercase tracking-wider">Giây</label>
                    <input id="j_i_sec" value="${intSecs}"  placeholder="0"  class="w-full mt-1.5 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono">
                </div>
            </div>
        </div>

        ${select('j_timezone', 'Timezone', d.timezone || 'Asia/Ho_Chi_Minh', [
            ['Asia/Ho_Chi_Minh','Asia/Ho_Chi_Minh (UTC+7)'],
            ['UTC','UTC'],
            ['Asia/Bangkok','Asia/Bangkok (UTC+7)'],
            ['Asia/Seoul','Asia/Seoul (UTC+9)'],
        ])}
        ${checkbox('j_enabled', 'Enabled', d.enabled)}
    `, async () => {
        const triggerType = val('j_trigger_type');
        let triggerArgs = {};
        if (triggerType === 'cron') {
            const mn = val('j_c_min'), hr = val('j_c_hr'), dow = val('j_c_dow'), dom = val('j_c_dom');
            if (mn)          triggerArgs.minute      = isNaN(mn)  ? mn  : parseInt(mn);
            if (hr)          triggerArgs.hour        = isNaN(hr)  ? hr  : parseInt(hr);
            if (dow && dow !== '*') triggerArgs.day_of_week = dow;
            if (dom && dom !== '*') triggerArgs.day        = isNaN(dom) ? dom : parseInt(dom);
        } else {
            const h = val('j_i_hr'), m = val('j_i_min'), s = val('j_i_sec');
            if (h && parseInt(h)) triggerArgs.hours   = parseInt(h);
            if (m && parseInt(m)) triggerArgs.minutes = parseInt(m);
            if (s && parseInt(s)) triggerArgs.seconds = parseInt(s);
        }
        const payload = {
            project_name: projectName,
            trigger_type: triggerType, trigger_args: triggerArgs,
            timezone: val('j_timezone'), enabled: check('j_enabled'),
        };
        await Api.saveScheduler(payload, job ? job.job_id : null);
    });

    setTimeout(() => {
        const sel = document.getElementById('j_trigger_type');
        if (!sel) return;
        sel.addEventListener('change', function() {
            document.getElementById('j_cron_wrap').classList.toggle('hidden', this.value !== 'cron');
            document.getElementById('j_int_wrap').classList.toggle('hidden', this.value === 'cron');
        });
    }, 0);
}

function _knoxSearchHtml(inputId, resultId) {
    return `<div>
        <label class="text-xs uppercase tracking-wider text-on-surface-muted font-semibold">Knox ID</label>
        <div class="flex gap-2 mt-2">
            <input id="${inputId}" class="flex-1 bg-surface-3/60 rounded-xl px-4 py-2.5 text-sm border border-outline/30 font-mono" placeholder="e.g. nhantt">
            <button type="button" id="${inputId}_btn"
                class="px-3 py-2.5 rounded-xl bg-surface-3/60 hover:bg-surface-4 border border-outline/30 transition text-on-surface-muted flex items-center gap-1 text-sm">
                <span class="material-icons-outlined" style="font-size:18px;">search</span>
            </button>
        </div>
        <div id="${resultId}" class="hidden mt-2 px-4 py-3 bg-surface-3/30 rounded-xl text-sm"></div>
    </div>`;
}

async function _knoxSearch(inputId, resultId, nameTargetId) {
    const knoxid = document.getElementById(inputId).value.trim();
    const el = document.getElementById(resultId);
    if (!knoxid) return;
    el.classList.remove('hidden');
    el.innerHTML = '<span class="text-on-surface-muted text-xs">Đang tìm…</span>';
    try {
        const u = await Api.searchUser(knoxid);
        el.innerHTML = `<div class="flex items-center gap-3">
            <span class="material-icons-outlined text-accent-success" style="font-size:18px;">check_circle</span>
            <div>
                <div class="font-medium text-sm">${u.name || knoxid}</div>
                <div class="text-xs text-on-surface-muted mt-0.5">${u.department || ''} ${u.group_name ? '· ' + u.group_name : ''} ${u.team ? '· ' + u.team : ''}</div>
            </div>
        </div>`;
        if (nameTargetId) document.getElementById(nameTargetId).value = u.name || '';
    } catch(e) {
        el.innerHTML = `<div class="flex items-center gap-2 text-yellow-400 text-xs">
            <span class="material-icons-outlined" style="font-size:15px;">info</span>
            Knox ID chưa có trong hệ thống — sẽ tạo mới khi lưu.
        </div>`;
        if (nameTargetId) document.getElementById(nameTargetId).value = '';
    }
}

function _wireKnoxSearch(inputId, resultId, nameTargetId) {
    setTimeout(() => {
        const btn = document.getElementById(inputId + '_btn');
        const inp = document.getElementById(inputId);
        if (!btn || !inp) return;
        btn.addEventListener('click', () => _knoxSearch(inputId, resultId, nameTargetId));
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _knoxSearch(inputId, resultId, nameTargetId); } });
    }, 0);
}

function openEmailModal(projectName) {
    showModal('Add Recipient', 'mail', `
        ${_knoxSearchHtml('e_knoxid', 'e_result')}
        <input id="e_name" type="hidden" value="">
    `, async () => {
        const knoxid = val('e_knoxid').trim();
        if (!knoxid) throw new Error('Vui lòng nhập Knox ID');
        await Api.addEmail(projectName, { email: knoxid, name: document.getElementById('e_name').value });
    });
    _wireKnoxSearch('e_knoxid', 'e_result', 'e_name');
}

function openAccessModal(projectName) {
    showModal('Grant Access', 'admin_panel_settings', `
        ${_knoxSearchHtml('a_knoxid', 'a_result')}
        <input id="a_name" type="hidden" value="">
        ${select('a_role', 'Role', 'viewer', [['viewer','Viewer — read only'],['editor','Editor — can modify'],['admin','Admin — full access']])}
    `, async () => {
        const knoxid = val('a_knoxid').trim();
        if (!knoxid) throw new Error('Vui lòng nhập Knox ID');
        await Api.grantAccess(projectName, { knoxid, name: document.getElementById('a_name').value, role: val('a_role') });
    });
    _wireKnoxSearch('a_knoxid', 'a_result', 'a_name');
}

function openProjectModal() {
    showModal('New Project', 'folder_special', `
        ${field('Project ID (slug)', 'p_name', '', 'font-mono', 'e.g. legal_task')}
        ${field('Tên hiển thị', 'p_display_name', '', '', 'e.g. Legal Task')}
        ${field('Version', 'p_version', '1.0.0', 'font-mono')}
        ${field('Description', 'p_desc', '')}
        ${field('Owner', 'p_owner', '')}
        <div class="flex gap-6 pt-2">
            ${checkbox('p_approval', 'Require approval', false)}
            ${checkbox('p_enabled', 'Enabled', true)}
        </div>
    `, async () => {
        const payload = {
            project_name: val('p_name').trim().replace(/\s+/g, '_'),
            name: val('p_display_name'),
            version: val('p_version') || '1.0.0',
            description: val('p_desc'),
            owner: val('p_owner'),
            require_approval: check('p_approval'),
            enabled: check('p_enabled'),
        };
        await Api.createProject(payload);
        await renderProjects();
    });
}

function openProjectEditModal(p) {
    const meta = p.metadata || {};
    showModal('Edit Project — ' + p.project_name, 'edit', `
        <div class="flex items-center gap-3 mb-2 p-3 bg-surface-3/30 rounded-xl">
            <span class="material-icons-outlined text-on-surface-muted" style="font-size:18px;">folder_special</span>
            <div class="min-w-0">
                <div class="font-mono font-semibold">${p.project_name}</div>
                <div class="text-xs text-on-surface-muted">Project slug — không thể thay đổi</div>
            </div>
        </div>
        <div class="flex items-center gap-3 p-3 bg-surface-3/30 rounded-xl">
            <span class="material-icons-outlined text-on-surface-muted" style="font-size:18px;">fingerprint</span>
            <div class="min-w-0">
                <div class="font-mono text-xs break-all text-on-surface-muted">${p.project_id || '—'}</div>
                <div class="text-xs text-on-surface-muted">UUID — tự động tạo, không thể thay đổi</div>
            </div>
        </div>
        ${field('Tên hiển thị', 'pe_display_name', meta.name || '')}
        ${field('Version', 'pe_version', p.version || '1.0.0', 'font-mono')}
        ${field('Description', 'pe_desc', meta.description || '')}
        ${field('Owner', 'pe_owner', meta.owner || '')}
        <div class="flex gap-6 pt-2">
            ${checkbox('pe_approval', 'Require approval', !!p.require_approval)}
            ${checkbox('pe_enabled', 'Enabled', p.enabled !== false)}
        </div>
    `, async () => {
        await Api.updateProject(p.project_name, {
            name:             val('pe_display_name'),
            version:          val('pe_version') || '1.0.0',
            description:      val('pe_desc'),
            owner:            val('pe_owner'),
            require_approval: check('pe_approval'),
            enabled:          check('pe_enabled'),
        });
        await renderProjects();
    });
}

async function removeEmailRecipient(projectName, id) {
    if (!confirm('Remove this recipient?')) return;
    await Api.deleteEmail(projectName, id);
    _pm ? await _refreshProjectModal() : navigate();
}

async function revokeUserAccess(projectName, id) {
    if (!confirm('Revoke access?')) return;
    await Api.revokeAccess(projectName, id);
    _pm ? await _refreshProjectModal() : navigate();
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
        <div class="p-6 space-y-4 overflow-y-auto flex-1">
            <div id="modal-error" class="hidden bg-accent-error/10 border border-accent-error/30 text-accent-error rounded-xl px-4 py-3 text-sm flex items-start gap-2">
                <span class="material-icons-outlined flex-shrink-0" style="font-size:18px;">error_outline</span>
                <span id="modal-error-msg"></span>
            </div>
            ${formHtml}
        </div>
        <div class="p-6 border-t border-outline/30 flex justify-end gap-3">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl text-sm bg-surface-3/60 hover:bg-surface-4 border border-outline/30 transition">Cancel</button>
            <button id="modal-save-btn" onclick="_modalSubmit()" class="btn-primary px-5 py-2.5 rounded-xl text-sm">Save</button>
        </div>
    </div>`;
    modal.classList.remove('hidden');
    window._modalSubmit = async () => {
        const errEl  = document.getElementById('modal-error');
        const errMsg = document.getElementById('modal-error-msg');
        const saveBtn = document.getElementById('modal-save-btn');
        errEl.classList.add('hidden');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        try {
            await onSubmit();
            closeModal();
            _pm ? await _refreshProjectModal() : navigate();
        } catch (e) {
            errMsg.textContent = e.message || 'Đã có lỗi xảy ra.';
            errEl.classList.remove('hidden');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    };
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ==================== Articles ====================
async function renderProjectArticles(el, projectName, requireApproval, sources) {
    el.innerHTML = `<div class="flex items-center justify-center py-12 text-on-surface-muted">
        <span class="material-icons-outlined animate-spin mr-2">refresh</span> Loading articles…</div>`;

    let articles = [];
    try {
        articles = await Api.getArticles({ project_name: projectName, limit: 500 });
    } catch(e) {
        el.innerHTML = `<div class="text-accent-error p-4">${e.message}</div>`;
        return;
    }

    // filter state stored on el
    if (!el._artFilter) el._artFilter = 'all';

    function articleStatusBadge(status) {
        const s = {
            pending:  'bg-yellow-500/10 text-yellow-400',
            approved: 'bg-accent-success/10 text-accent-success',
            rejected: 'bg-accent-error/10 text-accent-error',
        };
        return `<span class="px-2 py-0.5 rounded-md text-xs font-medium ${s[status] || 'bg-surface-4 text-on-surface-muted'}">${status}</span>`;
    }

    function scoreBadge(score) {
        const c = score >= 70 ? 'text-accent-success' : score >= 40 ? 'text-yellow-400' : 'text-on-surface-muted';
        return `<span class="${c} font-mono font-semibold text-sm">${score}</span>`;
    }

    function renderTable(list) {
        if (!list.length) return emptyState('newspaper', 'Không có bài viết nào.');
        return `<div class="overflow-x-auto">
        <table class="w-full text-sm">
            <thead><tr class="text-xs text-on-surface-muted uppercase tracking-wider border-b border-outline/20">
                <th class="text-left pb-3 pr-4 font-semibold">Tiêu đề</th>
                <th class="text-left pb-3 pr-4 font-semibold">Nguồn</th>
                <th class="text-left pb-3 pr-4 font-semibold">Ngày đăng</th>
                <th class="text-center pb-3 pr-4 font-semibold">Score</th>
                <th class="text-center pb-3 pr-4 font-semibold">Trạng thái</th>
                ${requireApproval ? '<th class="text-center pb-3 font-semibold">Hành động</th>' : ''}
            </tr></thead>
            <tbody class="divide-y divide-outline/10">
                ${list.map(a => {
                    const title = a.title || a.url.split('/').pop() || a.url;
                    const shortTitle = title.length > 70 ? title.slice(0, 70) + '…' : title;
                    const date = a.published_at_vn || (a.published_at ? a.published_at.slice(0, 10) : '—');
                    const isPending = a.status === 'pending';
                    const actions = requireApproval && isPending
                        ? `<td class="text-center pb-0 pt-2">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="approveArticle(${a.id}, '${projectName}')"
                                    class="px-2.5 py-1 rounded-lg text-xs bg-accent-success/10 text-accent-success hover:bg-accent-success/20 transition flex items-center gap-1">
                                    <span class="material-icons-outlined" style="font-size:13px;">check_circle</span>Duyệt
                                </button>
                                <button onclick="rejectArticle(${a.id}, '${projectName}')"
                                    class="px-2.5 py-1 rounded-lg text-xs bg-accent-error/10 text-accent-error hover:bg-accent-error/20 transition flex items-center gap-1">
                                    <span class="material-icons-outlined" style="font-size:13px;">cancel</span>Từ chối
                                </button>
                            </div></td>`
                        : requireApproval ? '<td></td>' : '';
                    return `<tr class="hover:bg-surface-3/30 transition">
                        <td class="py-3 pr-4 max-w-xs">
                            <a href="${a.url}" target="_blank" rel="noopener"
                               class="text-primary hover:underline line-clamp-2 block" title="${a.url}">${shortTitle}</a>
                        </td>
                        <td class="py-3 pr-4 text-on-surface-muted text-xs">${a.site_id || '—'}</td>
                        <td class="py-3 pr-4 text-on-surface-muted text-xs whitespace-nowrap">${date}</td>
                        <td class="py-3 pr-4 text-center">${scoreBadge(a.relevance_score)}</td>
                        <td class="py-3 pr-4 text-center">${articleStatusBadge(a.status)}</td>
                        ${actions}
                    </tr>`;
                }).join('')}
            </tbody>
        </table></div>`;
    }

    function getFiltered(f) {
        if (f === 'pending')  return articles.filter(a => a.status === 'pending');
        if (f === 'approved') return articles.filter(a => a.status === 'approved');
        if (f === 'rejected') return articles.filter(a => a.status === 'rejected');
        if (f === 'relevant') return articles.filter(a => a.is_relevant);
        return articles;
    }

    function doRender() {
        const f = el._artFilter || 'all';
        const counts = {
            all:      articles.length,
            pending:  articles.filter(a => a.status === 'pending').length,
            approved: articles.filter(a => a.status === 'approved').length,
            rejected: articles.filter(a => a.status === 'rejected').length,
            relevant: articles.filter(a => a.is_relevant).length,
        };
        const filters = [
            { key: 'all',      label: 'Tất cả' },
            { key: 'pending',  label: 'Chờ duyệt' },
            { key: 'approved', label: 'Đã duyệt' },
            { key: 'rejected', label: 'Từ chối' },
            { key: 'relevant', label: 'Liên quan' },
        ];
        el.innerHTML = `
        <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2 flex-wrap">
                ${filters.map(ft => `<button onclick="window._artSetFilter('${ft.key}')"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition ${f === ft.key
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-3/60 text-on-surface-muted hover:bg-surface-4'}">
                    ${ft.label}
                    <span class="ml-1 font-mono">${counts[ft.key]}</span>
                </button>`).join('')}
            </div>
            <button onclick="openAddArticleModal('${projectName}', ${JSON.stringify(sources).replace(/'/g, "&#39;")})"
                class="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
                <span class="material-icons-outlined" style="font-size:17px;">add</span>Thêm bài viết
            </button>
        </div>
        <div id="art-table-wrap">${renderTable(getFiltered(f))}</div>`;
    }

    window._artSetFilter = function(f) {
        el._artFilter = f;
        doRender();
    };

    doRender();
}

async function approveArticle(id, projectName) {
    await Api.updateArticle(id, { status: 'approved', approved_by: 'admin' });
    if (_pm) await _refreshProjectModal();
}

async function rejectArticle(id, projectName) {
    await Api.updateArticle(id, { status: 'rejected', approved_by: 'admin' });
    if (_pm) await _refreshProjectModal();
}

function openAddArticleModal(projectName, sources) {
    const sourceOpts = [
        ['manual', 'Manual Entry'],
        ...(sources || []).map(s => [s.site_id, s.name || s.site_id]),
    ];
    showModal('Thêm bài viết', 'newspaper', `
        ${field('URL bài viết', 'art_url', '', 'font-mono', 'https://...')}
        ${field('Tiêu đề (tùy chọn)', 'art_title', '', '', 'Để trống hệ thống sẽ tự lấy')}
        ${select('art_site', 'Nguồn', 'manual', sourceOpts)}
    `, async () => {
        const url = val('art_url').trim();
        if (!url.startsWith('http')) throw new Error('URL không hợp lệ — phải bắt đầu bằng http/https');
        await Api.addArticle({
            project_name: projectName,
            article_url:  url,
            title:        val('art_title').trim() || null,
            site_id:      val('art_site'),
        });
    });
}

// ==================== Project Manage Modal ====================
let _pm = null; // { name, project, emails, access, sources, schedulers, tab }

async function openProjectManageModal(name) {
    const el = document.getElementById('project-modal');
    el.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeProjectModal()"></div>
    <div class="relative z-10 flex flex-col bg-surface-1 rounded-2xl overflow-hidden border border-outline/20 shadow-2xl animate-slide-in"
         style="width:85%;height:80%;margin:auto;">
        <div class="flex items-center justify-center py-10 text-on-surface-muted">
            <span class="material-icons-outlined animate-spin mr-3">refresh</span> Loading…
        </div>
    </div>`;
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        const [project, emails, access, sources, schedulers] = await Promise.all([
            Api.getProject(name), Api.getEmails(name), Api.getAccess(name),
            Api.getSources(name), Api.getSchedulers(name),
        ]);
        _pm = { name, project, emails, access, sources, schedulers, tab: 'agents' };
        _renderProjectModal();
    } catch(e) {
        document.querySelector('#project-modal .relative.z-10').innerHTML =
            `<div class="p-8 text-accent-error">${e.message}</div>`;
    }
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.add('hidden');
    document.body.style.overflow = '';
    _pm = null;
}

function switchProjectModalTab(key) {
    if (!_pm) return;
    _pm.tab = key;
    // update tab active state
    document.querySelectorAll('#project-modal .pm-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.key === key);
        t.classList.toggle('text-on-surface-muted', t.dataset.key !== key);
    });
    const tc = document.getElementById('pm-tab-content');
    tc.innerHTML = '';
    _renderProjectModalTab(tc);
}

function _renderProjectModalTab(tc) {
    const { name, project, emails, access, sources, schedulers, tab } = _pm;
    switch (tab) {
        case 'agents':     renderAgents(tc, project.agents, name); break;
        case 'tasks':      renderTasks(tc, project.tasks, project.agents, name); break;
        case 'sources':    renderSources(tc, sources, name); break;
        case 'schedulers': renderSchedulers(tc, schedulers, name); break;
        case 'emails':     renderEmails(tc, emails, project.tasks, name); break;
        case 'access':     renderAccess(tc, access, name); break;
        case 'articles':   renderProjectArticles(tc, name, project.require_approval, sources); break;
        case 'logs':       renderLogs(tc, name, project.agents); break;
    }
}

function _renderProjectModal() {
    const { name, project, emails, access, sources, schedulers, tab } = _pm;
    const tabs = [
        { key: 'agents',     label: 'Agents',     icon: 'smart_toy',            count: project.agents.length },
        { key: 'tasks',      label: 'Tasks',       icon: 'checklist',            count: project.tasks.length },
        { key: 'sources',    label: 'Sources',     icon: 'language',             count: sources.length },
        { key: 'schedulers', label: 'Schedulers',  icon: 'schedule',             count: schedulers.length },
        { key: 'emails',     label: 'Emails',      icon: 'mail',                 count: emails.length },
        { key: 'access',     label: 'Access',      icon: 'admin_panel_settings', count: access.length },
        { key: 'articles',   label: 'Articles',    icon: 'newspaper',            count: null },
        { key: 'logs',       label: 'Logs',        icon: 'terminal',             count: null },
    ];

    const panel = document.querySelector('#project-modal .relative.z-10');
    panel.innerHTML = `
    <!-- Modal header -->
    <div class="flex items-start justify-between px-8 py-6 border-b border-outline/20 flex-shrink-0">
        <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center flex-shrink-0">
                <span class="material-icons-outlined text-primary" style="font-size:24px;">folder_special</span>
            </div>
            <div>
                <div class="flex items-center gap-3 mb-1">
                    <h2 class="font-display text-2xl font-extrabold tracking-tight">${project.metadata.name || project.project_name}</h2>
                    ${statusBadge(project.run_status)}
                </div>
                <div class="flex items-center gap-2 mb-1">
                    <code class="text-xs font-mono text-on-surface-muted bg-surface-3/40 px-2 py-0.5 rounded">${project.project_name}</code>
                </div>
                <p class="text-sm text-on-surface-muted">${project.metadata.description || '—'}</p>
                <div class="flex items-center gap-4 mt-2 text-xs text-on-surface-muted">
                    <span class="flex items-center gap-1"><span class="material-icons-outlined" style="font-size:13px;">commit</span>v${project.version}</span>
                    <span>·</span>
                    <span class="flex items-center gap-1"><span class="material-icons-outlined" style="font-size:13px;">group</span>${project.metadata.owner || '—'}</span>
                    <span>·</span>
                    <span>${project.require_approval ? '🔒 Manual approval' : '⚡ Auto-approve'}</span>
                </div>
            </div>
        </div>
        <button onclick="closeProjectModal()" class="w-9 h-9 rounded-xl hover:bg-surface-3 flex items-center justify-center text-on-surface-muted transition flex-shrink-0">
            <span class="material-icons-outlined">close</span>
        </button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-outline/30 flex-shrink-0 px-8">
        <div class="flex gap-1 overflow-x-auto">
            ${tabs.map(t => `
                <button data-key="${t.key}" onclick="switchProjectModalTab('${t.key}')"
                    class="pm-tab tab-item ${tab === t.key ? 'active' : 'text-on-surface-muted'} px-5 py-4 text-sm flex items-center gap-2 whitespace-nowrap font-medium">
                    <span class="material-icons-outlined" style="font-size:18px;">${t.icon}</span>
                    ${t.label}
                    ${t.count ? `<span class="px-1.5 py-0.5 rounded-md bg-surface-4 text-[10px] font-mono">${t.count}</span>` : ''}
                </button>`).join('')}
        </div>
    </div>

    <!-- Tab content -->
    <div id="pm-tab-content" class="flex-1 overflow-y-auto p-8 animate-slide-in"></div>`;

    _renderProjectModalTab(document.getElementById('pm-tab-content'));
}

// Refresh modal after CRUD ops inside it
async function _refreshProjectModal() {
    if (!_pm) return;
    const name = _pm.name;
    const tab  = _pm.tab;
    const [project, emails, access, sources, schedulers] = await Promise.all([
        Api.getProject(name), Api.getEmails(name), Api.getAccess(name),
        Api.getSources(name), Api.getSchedulers(name),
    ]);
    _pm = { name, project, emails, access, sources, schedulers, tab };
    _renderProjectModal();
}

// Init
window.addEventListener('hashchange', navigate);
navigate();
