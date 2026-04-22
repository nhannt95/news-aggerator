const LANG_META = {
    vi: { code: 'vi', label: 'Vietnamese', flag: 'VI' },
    en: { code: 'en', label: 'English', flag: 'EN' },
    kr: { code: 'kr', label: 'Korean', flag: 'KR' },
};

const PAGE_SIZE = 10;

let allArticles = [];
let currentProject = '';
let currentSearch = '';
let currentPage = 1;
let uiLanguage = localStorage.getItem('uiLanguage') || 'en';
let chartInstance = null;

// ==================== Helpers ====================
function topicColorClass(topic) {
    let hash = 0;
    for (let i = 0; i < topic.length; i++) hash = (hash * 31 + topic.charCodeAt(i)) & 0xffffffff;
    return 'topic-c' + (Math.abs(hash) % 8);
}

function topicChip(topic) {
    return `<span class="text-[10px] px-2 py-0.5 rounded-md font-medium ${topicColorClass(topic)}">${topic}</span>`;
}

function flagBadge(lang) {
    const colors = { vi: 'bg-accent-error/10 text-accent-error', en: 'bg-primary/10 text-primary', kr: 'bg-tertiary/10 text-tertiary' };
    return `<span class="${colors[lang] || 'bg-surface-3 text-on-surface-muted'} text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase">${(LANG_META[lang]?.flag) || lang}</span>`;
}

function relevanceBar(score) {
    return `<div class="flex items-center gap-2">
        <div class="w-20 h-1.5 bg-surface-4 rounded-full overflow-hidden">
            <div class="h-full relevance-bar rounded-full" style="width: ${score}%;"></div>
        </div>
        <span class="text-sm font-bold font-mono w-9 text-right">${score}%</span>
    </div>`;
}

/**
 * Parse "DD/MM/YYYY HH:MM ICT" → Date
 */
function parseVnDate(s) {
    if (!s) return null;
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (!m) return null;
    return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+07:00`);
}

function timeAgo(date) {
    if (!date) return '—';
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-GB');
}

function formatTimeLabel(s) {
    const m = s && s.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
    if (!m) return s || '—';
    return `${m[2]} · ${m[1]}`;
}

// ==================== Stats Row ====================
function renderStatsRow(articles) {
    const total = articles.length;
    const relevant = articles.filter(a => a.is_relevant).length;
    const topics = new Set(articles.flatMap(a => a.topics || [])).size;
    const sources = new Set(articles.map(a => a.source)).size;

    const card = (icon, label, value, color) => `
        <div class="bg-surface-2/60 rounded-xl p-3 flex items-center gap-3 card-glow-top">
            <div class="w-9 h-9 rounded-lg bg-${color}/10 flex items-center justify-center flex-shrink-0">
                <span class="material-icons-outlined text-${color}" style="font-size: 18px;">${icon}</span>
            </div>
            <div class="min-w-0">
                <div class="text-[10px] text-on-surface-muted uppercase tracking-wider">${label}</div>
                <div class="text-lg font-display font-extrabold leading-tight">${value}</div>
            </div>
        </div>`;

    document.getElementById('statsRow').innerHTML = `
        ${card('feed', 'Total Articles', total, 'primary')}
        ${card('auto_awesome', 'Relevant', relevant, 'tertiary')}
        ${card('topic', 'Topics', topics, 'secondary')}
        ${card('language', 'Sources', sources, 'accent-success')}`;
}

// ==================== Chart — articles per day ====================
function renderChart(articles) {
    // Group by date (DD/MM) for last 7 days
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        counts.push(articles.filter(a => {
            const ad = parseVnDate(a.published_at_vn);
            return ad && ad.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) === key;
        }).length);
    }

    // If mock data doesn't match real dates, simulate distribution
    if (counts.reduce((s, x) => s + x, 0) === 0) {
        const total = articles.length;
        for (let i = 0; i < 7; i++) counts[i] = Math.floor(Math.random() * Math.max(1, Math.ceil(total / 3)));
        counts[6] = total - counts.slice(0, 6).reduce((s, x) => s + x, 0);
        if (counts[6] < 0) counts[6] = 0;
    }

    const weekTotal = counts.reduce((s, x) => s + x, 0);
    document.getElementById('totalWeek').textContent = weekTotal + ' total';

    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('chartDaily');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                data: counts,
                borderColor: '#85adff',
                backgroundColor: (c) => {
                    const g = c.chart.ctx.createLinearGradient(0, 0, 0, 120);
                    g.addColorStop(0, 'rgba(133, 173, 255, 0.3)');
                    g.addColorStop(1, 'rgba(133, 173, 255, 0)');
                    return g;
                },
                fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 5,
                pointBackgroundColor: '#85adff', pointBorderColor: '#060e20', pointBorderWidth: 2,
                borderWidth: 2,
            }],
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#091328', borderColor: '#2a3352', borderWidth: 1 } },
            scales: {
                y: { display: false, beginAtZero: true },
                x: { ticks: { color: '#7b86a8', font: { size: 10 } }, grid: { display: false } },
            },
        },
    });
}

// ==================== Ticker ====================
function renderTicker(articles) {
    const items = articles.slice(0, 10).map(a => `
        <div class="inline-flex items-center gap-3 px-6">
            <span class="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></span>
            <span class="text-xs text-on-surface-muted font-mono uppercase tracking-wider">${a.project_name}</span>
            <span class="text-sm font-medium">${a.title}</span>
            <span class="text-xs text-on-surface-subtle">${timeAgo(parseVnDate(a.published_at_vn))}</span>
        </div>`).join('');
    document.getElementById('ticker').innerHTML = items + items;
}

// ==================== Articles List ====================
function renderArticles(articles) {
    const container = document.getElementById('articlesContainer');

    if (articles.length === 0) {
        container.innerHTML = `<div class="p-16 text-center">
            <div class="w-16 h-16 rounded-full bg-surface-3/50 flex items-center justify-center mx-auto mb-4">
                <span class="material-icons-outlined text-on-surface-muted" style="font-size: 28px;">inbox</span>
            </div>
            <p class="text-sm text-on-surface-muted">No articles found</p>
        </div>`;
        return;
    }

    // Pagination slice
    const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = articles.slice(start, start + PAGE_SIZE);

    container.innerHTML = `
    <div class="flex flex-col h-full">
        <div class="flex-1 overflow-y-auto">
            <table class="w-full text-sm">
                <thead class="sticky top-0 bg-surface-2 z-10 text-[10px] uppercase tracking-[0.15em] text-on-surface-muted font-semibold">
                    <tr class="text-left border-b border-outline/30">
                        <th class="px-5 py-3.5 w-12 bg-surface-3/40">#</th>
                        <th class="py-3.5 bg-surface-3/40">Topic · Source</th>
                        <th class="py-3.5 bg-surface-3/40">Title</th>
                        <th class="py-3.5 w-48 bg-surface-3/40">Relevance</th>
                        <th class="py-3.5 w-32 bg-surface-3/40"></th>
                    </tr>
                </thead>
                <tbody>
                    ${pageItems.map((a, i) => {
                        const publishedDate = parseVnDate(a.published_at_vn);
                        return `
                        <tr class="data-row border-t border-outline/20 cursor-pointer" onclick='openDetail(${JSON.stringify(a)})'>
                            <td class="px-5 py-4 text-on-surface-muted font-mono text-xs">${String(start + i + 1).padStart(2, '0')}</td>
                            <td class="py-4">
                                <div class="flex flex-col gap-1.5">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        ${(a.topics || []).slice(0, 2).map(topicChip).join('')}
                                    </div>
                                    <div class="flex items-center gap-2 text-xs text-on-surface-muted">
                                        <span>${a.source || '—'}</span>
                                        ${flagBadge(a.source_language)}
                                    </div>
                                </div>
                            </td>
                            <td class="py-4 pr-4">
                                <div class="font-medium leading-snug line-clamp-2">${a.title}</div>
                                <div class="text-xs text-on-surface-muted mt-1 flex items-center gap-2">
                                    <span class="flex items-center gap-1"><span class="material-icons-outlined" style="font-size:12px;">schedule</span>${formatTimeLabel(a.published_at_vn)}</span>
                                    <span>·</span>
                                    <span class="text-primary">${timeAgo(publishedDate)}</span>
                                </div>
                            </td>
                            <td class="py-4">${relevanceBar(a.relevance_score)}</td>
                            <td class="py-4 pr-5">
                                <div class="flex items-center gap-2 justify-end">
                                    <button onclick='event.stopPropagation(); openDetail(${JSON.stringify(a)})'
                                            class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition">
                                        <span class="material-icons-outlined" style="font-size: 14px;">visibility</span>
                                        View
                                    </button>
                                    ${a.url ? `<a href="${a.url}" target="_blank" onclick="event.stopPropagation()"
                                                  class="w-7 h-7 rounded-lg bg-surface-3/60 hover:bg-surface-4 flex items-center justify-center text-on-surface-muted hover:text-primary transition"
                                                  title="Open source">
                                        <span class="material-icons-outlined" style="font-size: 14px;">open_in_new</span>
                                    </a>` : ''}
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ${renderPagination(start, pageItems.length, articles.length, totalPages)}
    </div>`;

    let subtitle = currentProject ? `${articles.length} articles in ${currentProject}` : `${articles.length} articles across all projects`;
    if (currentSearch) subtitle += ` · search "${currentSearch}"`;
    document.getElementById('articleSubtitle').textContent = subtitle;
}

function renderPagination(start, shown, total, totalPages) {
    const pageNums = [];
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
        for (let i = 1; i <= totalPages; i++) pageNums.push(i);
    } else {
        pageNums.push(1);
        if (currentPage > 3) pageNums.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pageNums.push(i);
        if (currentPage < totalPages - 2) pageNums.push('...');
        pageNums.push(totalPages);
    }

    return `
    <div class="flex items-center justify-between px-5 py-3 border-t border-outline/30 flex-shrink-0">
        <div class="text-xs text-on-surface-muted">
            Showing <span class="text-on-surface font-semibold">${start + 1}–${start + shown}</span> of <span class="text-on-surface font-semibold">${total}</span>
        </div>
        <div class="flex items-center gap-1">
            <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                <span class="material-icons-outlined" style="font-size: 16px;">chevron_left</span>
            </button>
            ${pageNums.map(n => n === '...'
                ? `<span class="px-1 text-on-surface-muted">…</span>`
                : `<button class="page-btn ${n === currentPage ? 'active' : ''}" onclick="goToPage(${n})">${n}</button>`
            ).join('')}
            <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                <span class="material-icons-outlined" style="font-size: 16px;">chevron_right</span>
            </button>
        </div>
    </div>`;
}

window.goToPage = (n) => {
    currentPage = n;
    applyFilter();
};

// ==================== Breaking News ====================
function renderBreakingNews(articles) {
    const top = articles.filter(a => a.is_relevant).sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 4);
    const list = document.getElementById('breakingList');

    if (top.length === 0) {
        list.innerHTML = '<div class="text-xs text-on-surface-muted">No breaking news</div>';
        return;
    }

    list.innerHTML = top.map((a, i) => `
        <div class="group cursor-pointer" onclick='openDetail(${JSON.stringify(a)})'>
            <div class="flex items-start gap-2">
                <div class="text-lg font-display font-extrabold text-gradient leading-none w-6 flex-shrink-0">${String(i + 1).padStart(2, '0')}</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-0.5">
                        ${(a.topics || []).slice(0, 1).map(topicChip).join('')}
                        <span class="text-[10px] text-on-surface-muted font-mono">${a.relevance_score}%</span>
                    </div>
                    <div class="text-xs font-medium leading-snug group-hover:text-primary transition line-clamp-2">${a.title}</div>
                    <div class="text-[10px] text-on-surface-muted mt-0.5">${timeAgo(parseVnDate(a.published_at_vn))}</div>
                </div>
            </div>
        </div>`).join('');
}

// ==================== Top Topics ====================
function renderTopics(articles) {
    const count = {};
    articles.forEach(a => (a.topics || []).forEach(t => count[t] = (count[t] || 0) + 1));
    const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 12);

    document.getElementById('topicsList').innerHTML = sorted.length
        ? sorted.map(([t, c]) => `
            <button class="flex items-center gap-1 px-2 py-1 rounded-md transition text-[11px] ${topicColorClass(t)} hover:ring-1 hover:ring-current">
                <span>${t}</span>
                <span class="text-[9px] font-mono bg-canvas/40 px-1 py-0.5 rounded">${c}</span>
            </button>`).join('')
        : '<div class="text-xs text-on-surface-muted">No topics</div>';
}

// ==================== Top Sources ====================
function renderSources(articles) {
    const count = {};
    articles.forEach(a => { if (a.source) count[a.source] = (count[a.source] || 0) + 1; });
    const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted.length ? sorted[0][1] : 1;

    document.getElementById('sourcesList').innerHTML = sorted.length
        ? sorted.map(([s, c]) => `
            <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <div class="text-xs font-medium truncate">${s}</div>
                        <div class="text-[10px] text-on-surface-muted font-mono flex-shrink-0">${c}</div>
                    </div>
                    <div class="h-1 bg-surface-4 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-secondary to-primary rounded-full" style="width: ${(c / max) * 100}%"></div>
                    </div>
                </div>
            </div>`).join('')
        : '<div class="text-xs text-on-surface-muted">No sources</div>';
}

// ==================== Detail Modal ====================
function openDetail(article) {
    const translations = article.translations || {};
    const availableLangs = Object.keys(translations).length ? Object.keys(translations) : [article.source_language || 'vi'];
    let activeLang = availableLangs.includes(uiLanguage) ? uiLanguage : availableLangs[0];

    function renderModal() {
        const data = translations[activeLang] || {
            title: article.title, summary: '(No translation available)',
            content: '', analysis: '', recommendation: '',
        };

        const modal = document.getElementById('modal');
        modal.innerHTML = `
        <div class="bg-surface-1/95 glass rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden animate-in border border-outline/30 flex flex-col card-glow-top">
            <!-- Header -->
            <div class="p-5 border-b border-outline/30 flex items-center justify-between flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center">
                        <span class="material-icons-outlined text-primary" style="font-size: 20px;">article</span>
                    </div>
                    <div>
                        <div class="text-xs text-on-surface-muted uppercase tracking-wider">Article Detail</div>
                        <div class="font-mono text-xs text-on-surface-muted">${article.project_name} · #${article.id}</div>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    ${availableLangs.map(l => {
                        const m = LANG_META[l] || { flag: l.toUpperCase(), label: l };
                        return `<button onclick="_switchLang('${l}')" class="lang-tab ${l === activeLang ? 'active' : 'text-on-surface-muted'} px-4 py-2 text-xs font-semibold">
                            <span class="tracking-wider">${m.flag}</span>
                        </button>`;
                    }).join('')}
                    <button onclick="closeDetail()" class="ml-2 w-9 h-9 rounded-lg hover:bg-surface-3 flex items-center justify-center text-on-surface-muted transition">
                        <span class="material-icons-outlined">close</span>
                    </button>
                </div>
            </div>

            <!-- Title + Meta -->
            <div class="px-6 py-5 border-b border-outline/20 flex-shrink-0">
                <h2 class="font-display text-2xl font-extrabold tracking-tight leading-tight mb-3">${data.title || article.title}</h2>
                <div class="flex flex-wrap items-center gap-2.5 text-xs">
                    <span class="bg-primary/10 text-primary px-2 py-1 rounded-md font-semibold">${article.source || '—'}</span>
                    ${(article.topics || []).map(t => `<span class="${topicColorClass(t)} px-2 py-1 rounded-md">${t}</span>`).join('')}
                    <span class="text-on-surface-muted flex items-center gap-1">
                        <span class="material-icons-outlined" style="font-size:14px;">schedule</span>${article.published_at_vn}
                    </span>
                    <span class="text-primary">${timeAgo(parseVnDate(article.published_at_vn))}</span>
                    <span class="flex items-center gap-1 ml-auto">
                        <span class="material-icons-outlined text-primary" style="font-size: 14px;">auto_awesome</span>
                        <strong class="text-primary font-bold">${article.relevance_score}%</strong>
                    </span>
                    ${article.url ? `<a href="${article.url}" target="_blank" class="text-primary hover:underline flex items-center gap-1">
                        <span class="material-icons-outlined" style="font-size: 14px;">open_in_new</span>Source
                    </a>` : ''}
                </div>
            </div>

            <!-- 2-column body -->
            <div class="flex-1 min-h-0 grid grid-cols-2 gap-0 overflow-hidden">

                <!-- Left: Summary + Content -->
                <div class="p-6 overflow-y-auto border-r border-outline/20 space-y-6">
                    <section>
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span class="material-icons-outlined text-primary" style="font-size: 16px;">summarize</span>
                            </div>
                            <h3 class="text-xs uppercase tracking-[0.15em] text-on-surface-muted font-semibold">Summary</h3>
                        </div>
                        <p class="text-sm leading-relaxed text-on-surface/90">${data.summary || '—'}</p>
                    </section>

                    ${data.content ? `
                    <section>
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center">
                                <span class="material-icons-outlined text-secondary" style="font-size: 16px;">article</span>
                            </div>
                            <h3 class="text-xs uppercase tracking-[0.15em] text-on-surface-muted font-semibold">Full Content</h3>
                        </div>
                        <div class="text-sm leading-relaxed text-on-surface/80 whitespace-pre-line">${data.content}</div>
                    </section>` : ''}
                </div>

                <!-- Right: Analysis + Recommendation -->
                <div class="p-6 overflow-y-auto space-y-6 bg-surface-2/20">
                    ${data.analysis ? `
                    <section>
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-7 h-7 rounded-lg bg-tertiary/10 flex items-center justify-center">
                                <span class="material-icons-outlined text-tertiary" style="font-size: 16px;">psychology</span>
                            </div>
                            <h3 class="text-xs uppercase tracking-[0.15em] text-on-surface-muted font-semibold">AI Analysis</h3>
                        </div>
                        <div class="bg-gradient-to-br from-tertiary/8 to-transparent border-l-2 border-tertiary/50 pl-4 py-3 rounded-r-lg">
                            <p class="text-sm leading-relaxed">${data.analysis}</p>
                        </div>
                    </section>` : `
                    <section class="text-xs text-on-surface-muted italic">No analysis available</section>`}

                    ${data.recommendation ? `
                    <section>
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-7 h-7 rounded-lg bg-accent-success/10 flex items-center justify-center">
                                <span class="material-icons-outlined text-accent-success" style="font-size: 16px;">lightbulb</span>
                            </div>
                            <h3 class="text-xs uppercase tracking-[0.15em] text-on-surface-muted font-semibold">Recommendation</h3>
                        </div>
                        <div class="bg-gradient-to-br from-accent-success/8 to-transparent border-l-2 border-accent-success/50 pl-4 py-3 rounded-r-lg">
                            <p class="text-sm leading-relaxed">${data.recommendation}</p>
                        </div>
                    </section>` : ''}

                    <!-- Meta info compact -->
                    <section class="pt-4 border-t border-outline/20">
                        <h3 class="text-xs uppercase tracking-[0.15em] text-on-surface-muted font-semibold mb-3">Metadata</h3>
                        <div class="space-y-2 text-xs">
                            <div class="flex justify-between gap-3">
                                <span class="text-on-surface-muted">Project</span>
                                <span class="font-mono text-on-surface">${article.project_name}</span>
                            </div>
                            <div class="flex justify-between gap-3">
                                <span class="text-on-surface-muted">Article ID</span>
                                <span class="font-mono text-on-surface">#${article.id}</span>
                            </div>
                            <div class="flex justify-between gap-3">
                                <span class="text-on-surface-muted">Language</span>
                                <span class="font-mono text-on-surface">${(article.source_language || '').toUpperCase()}</span>
                            </div>
                            <div class="flex justify-between gap-3">
                                <span class="text-on-surface-muted">Relevance</span>
                                <span class="font-mono text-primary">${article.relevance_score}%</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>`;
        modal.classList.remove('hidden');
    }

    window._switchLang = (l) => { activeLang = l; renderModal(); };
    renderModal();
}

function closeDetail() {
    document.getElementById('modal').classList.add('hidden');
}

// ==================== Filter ====================
function applyFilter() {
    let filtered = currentProject ? allArticles.filter(a => a.project_name === currentProject) : allArticles;
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(a =>
            (a.title || '').toLowerCase().includes(q) ||
            (a.source || '').toLowerCase().includes(q) ||
            (a.topics || []).some(t => t.toLowerCase().includes(q))
        );
    }
    renderStatsRow(filtered);
    renderChart(filtered);
    renderArticles(filtered);
    renderBreakingNews(filtered);
    renderTopics(filtered);
    renderSources(filtered);
    renderTicker(filtered);
}

// ==================== Init ====================
async function init() {
    const [projects, articles] = await Promise.all([Api.getProjects(), Api.getArticles()]);
    allArticles = articles;

    const projectSelect = document.getElementById('projectFilter');
    projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.project_name;
        opt.textContent = p.project_name;
        projectSelect.appendChild(opt);
    });
    projectSelect.addEventListener('change', (e) => {
        currentProject = e.target.value;
        currentPage = 1;
        applyFilter();
    });

    const langSelect = document.getElementById('uiLanguage');
    langSelect.value = uiLanguage;
    langSelect.addEventListener('change', (e) => {
        uiLanguage = e.target.value;
        localStorage.setItem('uiLanguage', uiLanguage);
    });

    const searchToggle = document.getElementById('searchToggle');
    const searchInput = document.getElementById('searchInput');
    searchToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        searchInput.classList.toggle('hidden');
        if (!searchInput.classList.contains('hidden')) searchInput.focus();
    });
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        applyFilter();
    });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            currentSearch = '';
            searchInput.classList.add('hidden');
            applyFilter();
        }
    });
    document.addEventListener('click', (e) => {
        if (!searchInput.classList.contains('hidden') &&
            !searchInput.contains(e.target) &&
            !searchToggle.contains(e.target)) {
            if (!searchInput.value) searchInput.classList.add('hidden');
        }
    });

    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    applyFilter();
}

init();
