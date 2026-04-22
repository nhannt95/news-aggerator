const LANG_META = {
    vi: { code: 'vi', label: 'Vietnamese', flag: 'VI' },
    en: { code: 'en', label: 'English', flag: 'EN' },
    kr: { code: 'kr', label: 'Korean', flag: 'KR' },
};

let uiLanguage = localStorage.getItem('uiLanguage') || 'en';
let allArticles = [];

// ==================== Helpers ====================
function topicColorClass(topic) {
    let hash = 0;
    for (let i = 0; i < topic.length; i++) hash = (hash * 31 + topic.charCodeAt(i)) & 0xffffffff;
    return 'topic-c' + (Math.abs(hash) % 8);
}

function hashColor(seed) {
    const colors = [
        ['#85adff', '#6e9fff'],
        ['#ac8aff', '#9093ff'],
        ['#6fcf97', '#85adff'],
        ['#f2c94c', '#ac8aff'],
        ['#ff716c', '#ac8aff'],
        ['#9093ff', '#85adff'],
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(hash) % colors.length];
}

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

function getTranslated(article, field, lang) {
    const t = article.translations && article.translations[lang];
    if (t && t[field]) return t[field];
    const src = article.translations && article.translations[article.source_language];
    if (src && src[field]) return src[field];
    return article[field] || '';
}

// ==================== Preloader ====================
function runPreloader() {
    return new Promise(resolve => {
        const counter = document.getElementById('preloaderCounter');
        const preloader = document.getElementById('preloader');
        let v = 0;
        const int = setInterval(() => {
            v = Math.min(v + Math.floor(Math.random() * 7) + 2, 100);
            counter.textContent = String(v).padStart(2, '0');
            if (v >= 100) {
                clearInterval(int);
                setTimeout(() => {
                    preloader.classList.add('done');
                    setTimeout(resolve, 900);
                }, 300);
            }
        }, 80);
    });
}

// ==================== Custom Cursor ====================
function initCursor() {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    // Smooth lerp for ring
    function animate() {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animate);
    }
    animate();

    // Hover state
    const interactables = 'a, button, .data-cursor, [onclick], input, select, textarea';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(interactables)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(interactables)) document.body.classList.remove('cursor-hover');
    });
}

// ==================== Magnetic buttons ====================
function initMagnetic() {
    document.querySelectorAll('.magnetic').forEach(el => {
        const strength = 0.4;
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0, 0)';
        });
    });
}

// ==================== Number counter animate ====================
function animateCounter(el, target, duration = 1800) {
    const start = 0;
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        const value = Math.floor(start + (target - start) * eased);
        el.textContent = String(value).padStart(2, '0');
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ==================== Ticker ====================
function renderTicker() {
    const items = allArticles.slice(0, 10).map(a => `
        <span class="inline-flex items-center gap-3 px-6">
            <span class="w-1 h-1 rounded-full bg-on-surface-muted"></span>
            <span class="text-[10px] font-mono uppercase tracking-widest text-on-surface-muted">${a.project_name}</span>
            <span class="text-xs">${a.title}</span>
            <span class="text-[10px] text-on-surface-subtle">${timeAgo(parseVnDate(a.published_at_vn))}</span>
        </span>`).join('');
    document.getElementById('ticker').innerHTML = items + items;
}

// ==================== Hero ====================
function renderHero() {
    const top = [...allArticles].sort((a, b) => b.relevance_score - a.relevance_score);
    const hero = top.find(a => a.is_relevant && a.translations) || top[0];

    const el = document.getElementById('heroArticle');
    el.onclick = () => openDetail(hero);
    const title = getTranslated(hero, 'title', uiLanguage) || hero.title;
    el.innerHTML = `
        <div class="text-xs text-on-surface-muted mb-3">${hero.source} · ${timeAgo(parseVnDate(hero.published_at_vn))}</div>
        <div class="font-display font-medium text-2xl leading-tight mb-4 group-hover:text-primary transition">${title}</div>
        <div class="text-xs text-primary flex items-center gap-2">
            Read story
            <span class="material-icons-outlined arrow-slide" style="font-size: 14px;">arrow_forward</span>
        </div>`;

    // Animate stats
    const total = allArticles.length;
    const relevant = allArticles.filter(a => a.is_relevant).length;
    const projects = new Set(allArticles.map(a => a.project_name)).size;
    const sources = new Set(allArticles.map(a => a.source).filter(Boolean)).size;

    setTimeout(() => {
        animateCounter(document.getElementById('statTotal'), total);
        animateCounter(document.getElementById('statRelevant'), relevant);
        animateCounter(document.getElementById('statProjects'), projects);
        animateCounter(document.getElementById('statSources'), sources);
    }, 800);
}

// ==================== Featured horizontal scroll ====================
function renderFeatured() {
    const top = allArticles.filter(a => a.is_relevant).sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 8);
    const container = document.getElementById('featuredScroll');

    container.innerHTML = top.map((a, i) => {
        const [c1, c2] = hashColor(a.title);
        const title = getTranslated(a, 'title', uiLanguage) || a.title;
        return `
        <article class="story-card data-cursor group cursor-pointer" onclick='openDetail(${JSON.stringify(a)})'
                 style="--c1: ${c1}; --c2: ${c2}; width: clamp(300px, 32vw, 520px);">
            <div class="relative h-[70vh] max-h-[640px] bg-surface-2 overflow-hidden flex flex-col justify-between p-8">
                <div class="cover"></div>
                <div class="relative z-10 flex items-start justify-between">
                    <div class="eyebrow">${String(i + 1).padStart(2, '0')} / ${String(top.length).padStart(2, '0')}</div>
                    <div class="flex items-center gap-2 text-xs">
                        ${(a.topics || []).slice(0, 1).map(t => `<span class="pill ${topicColorClass(t)}">${t}</span>`).join('')}
                    </div>
                </div>
                <div class="relative z-10">
                    <div class="text-xs text-on-surface-muted mb-3 flex items-center gap-2">
                        <span>${a.source}</span>
                        <span>·</span>
                        <span>${timeAgo(parseVnDate(a.published_at_vn))}</span>
                    </div>
                    <h3 class="font-display font-medium text-2xl md:text-3xl leading-tight mb-6 line-clamp-4">${title}</h3>
                    <div class="flex items-center gap-2 text-xs group-hover:text-primary transition">
                        <span>Read</span>
                        <span class="material-icons-outlined arrow-slide" style="font-size: 14px;">arrow_forward</span>
                    </div>
                </div>
            </div>
        </article>`;
    }).join('');
}

// ==================== Topics ====================
function renderTopics() {
    const count = {};
    allArticles.forEach(a => (a.topics || []).forEach(t => count[t] = (count[t] || 0) + 1));
    const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);

    const el = document.getElementById('topicsList');
    el.innerHTML = sorted.map(([t, c]) => `
        <button class="pill pill-muted data-cursor">
            <span class="${topicColorClass(t)}">${t}</span>
            <span class="text-on-surface-subtle font-mono text-[10px]">${String(c).padStart(2, '0')}</span>
        </button>`).join('');
}

// ==================== Timeline ====================
function renderTimeline() {
    const recent = [...allArticles].sort((a, b) => {
        const da = parseVnDate(a.published_at_vn) || new Date(0);
        const db = parseVnDate(b.published_at_vn) || new Date(0);
        return db - da;
    }).slice(0, 10);

    const el = document.getElementById('timeline');
    el.innerHTML = recent.map((a, i) => {
        const title = getTranslated(a, 'title', uiLanguage) || a.title;
        return `
        <div class="data-cursor group cursor-pointer grid grid-cols-12 gap-4 py-8 border-t border-outline/20 last:border-b" onclick='openDetail(${JSON.stringify(a)})'>
            <div class="col-span-2 md:col-span-1 font-mono text-xs text-on-surface-muted">${String(i + 1).padStart(2, '0')}</div>
            <div class="col-span-4 md:col-span-2 font-mono text-xs text-on-surface-muted">
                ${(a.published_at_vn || '').split(' ')[1] || '—'}
                <div class="text-on-surface-subtle mt-1">${timeAgo(parseVnDate(a.published_at_vn))}</div>
            </div>
            <div class="col-span-12 md:col-span-6 font-display text-xl md:text-2xl leading-snug group-hover:text-primary transition">
                ${title}
            </div>
            <div class="col-span-6 md:col-span-2 text-xs text-on-surface-muted flex items-center gap-2">
                ${(a.topics || []).slice(0, 1).map(t => `<span class="${topicColorClass(t)}">${t}</span>`).join('')}
            </div>
            <div class="col-span-6 md:col-span-1 flex items-center justify-end gap-2 text-xs">
                <span class="text-primary font-bold">${a.relevance_score}%</span>
                <span class="material-icons-outlined arrow-slide text-on-surface-muted group-hover:text-primary" style="font-size: 16px;">arrow_forward</span>
            </div>
        </div>`;
    }).join('');
}

// ==================== Detail modal ====================
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
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
        <div class="modal-content bg-surface-1 rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden border border-outline/30 flex flex-col">
            <div class="p-5 border-b border-outline/30 flex items-center justify-between flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-gradient-to-br from-primary to-tertiary"></div>
                    <div class="font-mono text-xs text-on-surface-muted">${article.project_name} · #${article.id}</div>
                </div>
                <div class="flex items-center gap-1">
                    ${availableLangs.map(l => {
                        const m = LANG_META[l] || { flag: l.toUpperCase() };
                        return `<button onclick="_switchLang('${l}')" class="lang-tab ${l === activeLang ? 'active' : 'text-on-surface-muted'} px-4 py-2 text-xs font-semibold tracking-wider data-cursor">${m.flag}</button>`;
                    }).join('')}
                    <button onclick="closeDetail()" class="ml-2 w-9 h-9 rounded-lg hover:bg-surface-3 flex items-center justify-center text-on-surface-muted transition data-cursor">
                        <span class="material-icons-outlined">close</span>
                    </button>
                </div>
            </div>
            <div class="px-8 py-6 border-b border-outline/20 flex-shrink-0">
                <h2 class="font-display font-medium text-4xl tracking-tight leading-tight mb-4">${data.title || article.title}</h2>
                <div class="flex flex-wrap items-center gap-3 text-xs">
                    <span class="text-on-surface-muted">${article.source || '—'}</span>
                    <span class="text-on-surface-subtle">·</span>
                    ${(article.topics || []).map(t => `<span class="${topicColorClass(t)}">${t}</span>`).join(' <span class="text-on-surface-subtle">·</span> ')}
                    <span class="text-on-surface-subtle">·</span>
                    <span class="text-on-surface-muted">${article.published_at_vn}</span>
                    <span class="flex items-center gap-1 ml-auto">
                        <span class="material-icons-outlined text-primary" style="font-size: 14px;">auto_awesome</span>
                        <strong class="text-primary">${article.relevance_score}%</strong>
                    </span>
                </div>
            </div>
            <div class="flex-1 min-h-0 grid grid-cols-2 overflow-hidden">
                <div class="p-8 overflow-y-auto border-r border-outline/20 space-y-8">
                    <section>
                        <div class="eyebrow mb-4">Summary</div>
                        <p class="text-base leading-relaxed">${data.summary || '—'}</p>
                    </section>
                    ${data.content ? `
                    <section>
                        <div class="eyebrow mb-4">Full Content</div>
                        <div class="text-sm leading-relaxed text-on-surface/80 whitespace-pre-line">${data.content}</div>
                    </section>` : ''}
                </div>
                <div class="p-8 overflow-y-auto space-y-8 bg-surface-2/20">
                    ${data.analysis ? `
                    <section>
                        <div class="eyebrow mb-4">AI Analysis</div>
                        <div class="border-l border-tertiary/50 pl-5 py-1">
                            <p class="text-sm leading-relaxed">${data.analysis}</p>
                        </div>
                    </section>` : ''}
                    ${data.recommendation ? `
                    <section>
                        <div class="eyebrow mb-4">Recommendation</div>
                        <div class="border-l border-accent-success/50 pl-5 py-1">
                            <p class="text-sm leading-relaxed">${data.recommendation}</p>
                        </div>
                    </section>` : ''}
                </div>
            </div>
        </div>`;
        modal.classList.remove('hidden');
    }

    window._switchLang = (l) => { activeLang = l; renderModal(); };
    renderModal();
}

function closeDetail() {
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    modal.innerHTML = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
});

// ==================== Scroll reveal ====================
let observer;
function observeReveal() {
    if (!observer) {
        observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    observer.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
    }
    document.querySelectorAll('[data-reveal]:not(.visible)').forEach(el => observer.observe(el));
}

// ==================== Init ====================
async function init() {
    // Load data while preloader runs
    const [articles] = await Promise.all([
        Api.getArticles(),
        runPreloader(),
    ]);
    allArticles = articles;

    renderTicker();
    renderHero();
    renderFeatured();
    renderTopics();
    renderTimeline();

    initCursor();
    initMagnetic();
    observeReveal();

    // Lang select
    const langSelect = document.getElementById('langSelect');
    langSelect.value = uiLanguage;
    langSelect.addEventListener('change', (e) => {
        uiLanguage = e.target.value;
        localStorage.setItem('uiLanguage', uiLanguage);
        renderHero();
        renderFeatured();
        renderTimeline();
    });
}

init();
