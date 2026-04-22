/**
 * Synthetica UI Components
 *
 * Usage:
 *   UI.loading.show({ message: 'Crawling articles...' });
 *   UI.loading.hide();
 *
 *   const btn = UI.button({ label: 'Save', icon: 'check', onClick: () => {} });
 *   container.appendChild(btn);
 *
 *   container.appendChild(UI.card({ title: '...', content: '...' }));
 *
 *   UI.alert({ type: 'success', title: 'Saved!', message: 'Article saved.' });
 *
 *   UI.dialog({
 *     type: 'warning',
 *     title: 'Delete article?',
 *     message: 'This cannot be undone.',
 *     buttons: [
 *       { label: 'Cancel', variant: 'ghost' },
 *       { label: 'Delete', variant: 'solid', color: 'error', onClick: () => {...} },
 *     ],
 *   });
 */

const UI = (() => {

    // ========== Helpers ==========
    const COLOR_PRESETS = {
        primary:  { from: '#85adff', to: '#6e9fff', solid: '#85adff', shadow: 'rgba(133, 173, 255, 0.2)', shadowHover: 'rgba(133, 173, 255, 0.35)' },
        tertiary: { from: '#ac8aff', to: '#9093ff', solid: '#ac8aff', shadow: 'rgba(172, 138, 255, 0.2)', shadowHover: 'rgba(172, 138, 255, 0.35)' },
        success:  { from: '#6fcf97', to: '#52b57e', solid: '#6fcf97', shadow: 'rgba(111, 207, 151, 0.2)', shadowHover: 'rgba(111, 207, 151, 0.35)' },
        warning:  { from: '#f2c94c', to: '#d9ae2e', solid: '#f2c94c', shadow: 'rgba(242, 201, 76, 0.2)', shadowHover: 'rgba(242, 201, 76, 0.35)' },
        error:    { from: '#ff716c', to: '#e65854', solid: '#ff716c', shadow: 'rgba(255, 113, 108, 0.2)', shadowHover: 'rgba(255, 113, 108, 0.35)' },
        neutral:  { from: '#1f2b49', to: '#192540', solid: '#7b86a8', shadow: 'rgba(0, 0, 0, 0.3)', shadowHover: 'rgba(0, 0, 0, 0.5)' },
    };

    function resolveColor(color) {
        if (!color) return COLOR_PRESETS.primary;
        if (typeof color === 'string' && COLOR_PRESETS[color]) return COLOR_PRESETS[color];
        // Custom object: { from, to, solid, shadow, shadowHover }
        if (typeof color === 'object') return { ...COLOR_PRESETS.primary, ...color };
        // Custom single hex
        return { from: color, to: color, solid: color, shadow: color + '33', shadowHover: color + '55' };
    }

    function setVars(el, vars) {
        Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
    }

    function icon(name, size) {
        const s = size ? `style="font-size:${size}px"` : '';
        return `<span class="material-icons-outlined" ${s}>${name}</span>`;
    }

    // ========== Loading ==========
    const loading = (() => {
        let overlay = null;

        function spinnerHtml(size = 'lg', from, to) {
            return `
                <div class="ui-spinner-wrapper ${size}" style="${from ? `--ui-spinner-from: ${from};` : ''} ${to ? `--ui-spinner-to: ${to};` : ''}">
                    <div class="ui-spinner"></div>
                    <div class="ui-spinner-inner"></div>
                </div>`;
        }

        return {
            /**
             * Show full-screen loading overlay.
             * @param {Object} opts
             * @param {string} opts.message - Text under spinner
             * @param {string} opts.from - Spinner gradient start color (default purple)
             * @param {string} opts.to - Spinner gradient end color (default cyan)
             */
            show({ message = '', from, to } = {}) {
                if (overlay) return;
                overlay = document.createElement('div');
                overlay.className = 'ui-loading-overlay';
                overlay.innerHTML = spinnerHtml('lg', from, to) +
                    (message ? `<div class="ui-loading-text">${message}</div>` : '');
                document.body.appendChild(overlay);
            },

            hide() {
                if (!overlay) return;
                overlay.style.animation = 'uiFadeIn 0.2s reverse';
                setTimeout(() => { if (overlay) { overlay.remove(); overlay = null; } }, 200);
            },

            /**
             * Inline spinner (returns HTML element).
             * @param {Object} opts
             * @param {string} opts.size - 'sm' | 'md' | 'lg'
             * @param {string} opts.message
             */
            inline({ size = 'md', message = '', from, to } = {}) {
                const el = document.createElement('div');
                el.className = 'ui-loading-inline';
                el.innerHTML = spinnerHtml(size, from, to) +
                    (message ? `<div class="ui-loading-text">${message}</div>` : '');
                return el;
            },
        };
    })();

    // ========== Button ==========
    /**
     * @param {Object} opts
     * @param {string} opts.label
     * @param {string} opts.icon - Material icon name
     * @param {string} opts.iconRight - Icon on right side
     * @param {string} opts.color - 'primary'|'tertiary'|'success'|'warning'|'error'|'neutral' or hex
     * @param {string} opts.variant - 'solid'|'outline'|'ghost'|'soft' (default 'solid')
     * @param {string} opts.size - 'sm'|'md'|'lg' (default 'md')
     * @param {Function} opts.onClick
     * @param {boolean} opts.disabled
     * @param {string} opts.type - 'button'|'submit' (default 'button')
     * @returns {HTMLButtonElement}
     */
    function button({ label = '', icon: iconName, iconRight, color = 'primary', variant = 'solid', size = 'md', onClick, disabled = false, type = 'button' } = {}) {
        const btn = document.createElement('button');
        btn.type = type;
        btn.disabled = disabled;
        btn.className = `ui-btn ui-btn-${variant} ${size !== 'md' ? 'ui-btn-' + size : ''}`;

        const c = resolveColor(color);
        if (variant === 'solid') {
            setVars(btn, {
                '--ui-btn-from': c.from, '--ui-btn-to': c.to,
                '--ui-btn-shadow': c.shadow, '--ui-btn-shadow-hover': c.shadowHover,
            });
        } else if (variant === 'outline' || variant === 'ghost') {
            setVars(btn, { '--ui-btn-color': c.solid });
        } else if (variant === 'soft') {
            setVars(btn, {
                '--ui-btn-color': c.solid,
                '--ui-btn-bg': c.solid + '1a',
                '--ui-btn-bg-hover': c.solid + '33',
            });
        }

        btn.innerHTML =
            (iconName ? icon(iconName, 16) : '') +
            (label ? `<span>${label}</span>` : '') +
            (iconRight ? icon(iconRight, 16) : '');

        if (onClick) btn.addEventListener('click', onClick);
        return btn;
    }

    // ========== Card ==========
    /**
     * @param {Object} opts
     * @param {string} opts.title
     * @param {string} opts.subtitle
     * @param {string} opts.icon
     * @param {string|HTMLElement} opts.content - HTML or element
     * @param {string|HTMLElement} opts.footer
     * @param {string} opts.color - Icon/glow color
     * @param {boolean} opts.hover - Enable hover lift (default true)
     * @param {boolean} opts.glow - Enable top glow border (default true)
     * @returns {HTMLElement}
     */
    function card({ title, subtitle, icon: iconName, content, footer, color = 'primary', hover = true, glow = true } = {}) {
        const c = resolveColor(color);
        const el = document.createElement('div');
        el.className = 'ui-card' + (hover ? ' ui-card-hover' : '') + (glow ? ' ui-card-glow' : '');
        setVars(el, {
            '--ui-card-icon-bg': c.solid + '1a',
            '--ui-card-icon-color': c.solid,
            '--ui-card-glow': c.solid + '66',
        });

        let html = '';
        if (title || iconName) {
            html += `<div class="ui-card-header">`;
            if (iconName) html += `<div class="ui-card-icon">${icon(iconName, 20)}</div>`;
            if (title) {
                html += `<div>
                    <h3 class="ui-card-title">${title}</h3>
                    ${subtitle ? `<div class="ui-card-subtitle">${subtitle}</div>` : ''}
                </div>`;
            }
            html += `</div>`;
        }
        if (content) {
            html += `<div class="ui-card-body"></div>`;
        }

        el.innerHTML = html;

        const body = el.querySelector('.ui-card-body');
        if (body && content) {
            if (content instanceof HTMLElement) body.appendChild(content);
            else body.innerHTML = content;
        }

        if (footer) {
            const f = document.createElement('div');
            f.className = 'ui-card-footer';
            if (footer instanceof HTMLElement) f.appendChild(footer);
            else f.innerHTML = footer;
            el.appendChild(f);
        }

        return el;
    }

    // ========== Alert (toast) ==========
    const alert = (() => {
        let container = null;

        function ensureContainer() {
            if (!container) {
                container = document.createElement('div');
                container.className = 'ui-alert-container';
                document.body.appendChild(container);
            }
            return container;
        }

        const ICONS = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info',
        };

        /**
         * @param {Object} opts
         * @param {string} opts.type - 'success'|'error'|'warning'|'info' (default 'info')
         * @param {string} opts.title
         * @param {string} opts.message
         * @param {number} opts.duration - Auto-dismiss ms (default 5000, 0 = persistent)
         * @param {boolean} opts.closable - Show close button (default true)
         * @param {string} opts.icon - Custom material icon
         */
        function show({ type = 'info', title = '', message = '', duration = 5000, closable = true, icon: iconName } = {}) {
            ensureContainer();
            const el = document.createElement('div');
            el.className = `ui-alert ui-alert-${type}`;
            if (duration > 0) el.style.setProperty('--ui-alert-duration', duration + 'ms');

            el.innerHTML = `
                <div class="ui-alert-icon">${icon(iconName || ICONS[type] || 'info', 18)}</div>
                <div class="ui-alert-body">
                    ${title ? `<div class="ui-alert-title">${title}</div>` : ''}
                    ${message ? `<div class="ui-alert-message">${message}</div>` : ''}
                </div>
                ${closable ? `<button class="ui-alert-close">${icon('close', 14)}</button>` : ''}
                ${duration > 0 ? `<div class="ui-alert-progress"></div>` : ''}
            `;

            const remove = () => {
                el.classList.add('removing');
                setTimeout(() => el.remove(), 260);
            };

            if (closable) el.querySelector('.ui-alert-close').onclick = remove;
            if (duration > 0) setTimeout(remove, duration);

            container.appendChild(el);
            return { close: remove };
        }

        return {
            show,
            success: (opts) => show({ ...opts, type: 'success' }),
            error:   (opts) => show({ ...opts, type: 'error' }),
            warning: (opts) => show({ ...opts, type: 'warning' }),
            info:    (opts) => show({ ...opts, type: 'info' }),
        };
    })();

    // ========== Dialog ==========
    const DIALOG_ICONS = {
        info: 'info',
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        confirm: 'help_outline',
    };

    /**
     * @param {Object} opts
     * @param {string} opts.type - 'info'|'success'|'error'|'warning'|'confirm'
     * @param {string} opts.title
     * @param {string} opts.message
     * @param {string|HTMLElement} opts.content - Custom body (overrides message)
     * @param {string} opts.icon - Custom icon
     * @param {Array} opts.buttons - [{ label, variant, color, onClick, closeOnClick }]
     * @param {boolean} opts.closable - Show X button + close on backdrop click (default true)
     * @param {Function} opts.onClose
     * @returns {Object} { close }
     */
    function dialog({ type = 'info', title = '', message = '', content, icon: iconName, buttons = [], closable = true, onClose } = {}) {
        const backdrop = document.createElement('div');
        backdrop.className = 'ui-dialog-backdrop';

        const dlg = document.createElement('div');
        dlg.className = `ui-dialog ui-dialog-${type}`;

        const headHtml = `
            <div class="ui-dialog-header">
                <div class="ui-dialog-icon">${icon(iconName || DIALOG_ICONS[type] || 'info', 22)}</div>
                <div class="ui-dialog-heading">
                    <h3 class="ui-dialog-title">${title}</h3>
                    ${message ? `<div class="ui-dialog-subtitle">${message}</div>` : ''}
                </div>
                ${closable ? `<button class="ui-dialog-close">${icon('close', 18)}</button>` : ''}
            </div>
        `;

        let bodyEl = null;
        if (content) {
            dlg.innerHTML = headHtml + `<div class="ui-dialog-body"></div>`;
            bodyEl = dlg.querySelector('.ui-dialog-body');
            if (content instanceof HTMLElement) bodyEl.appendChild(content);
            else bodyEl.innerHTML = content;
        } else {
            dlg.innerHTML = headHtml;
        }

        const close = () => {
            backdrop.style.animation = 'uiFadeIn 0.2s reverse';
            setTimeout(() => {
                backdrop.remove();
                if (onClose) onClose();
            }, 200);
        };

        if (buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'ui-dialog-footer';
            buttons.forEach(b => {
                const btn = button({
                    label: b.label,
                    icon: b.icon,
                    color: b.color || (type === 'error' || type === 'warning' ? type : 'primary'),
                    variant: b.variant || 'solid',
                    onClick: () => {
                        if (b.onClick) b.onClick();
                        if (b.closeOnClick !== false) close();
                    },
                });
                footer.appendChild(btn);
            });
            dlg.appendChild(footer);
        }

        backdrop.appendChild(dlg);

        if (closable) {
            const closeBtn = dlg.querySelector('.ui-dialog-close');
            if (closeBtn) closeBtn.onclick = close;
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) close();
            });
        }

        document.body.appendChild(backdrop);

        return { close };
    }

    /** Quick confirm dialog. Returns Promise<boolean> */
    function confirm({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', color = 'primary' } = {}) {
        return new Promise(resolve => {
            dialog({
                type: 'confirm', title, message,
                buttons: [
                    { label: cancelLabel, variant: 'ghost', color: 'neutral', onClick: () => resolve(false) },
                    { label: confirmLabel, variant: 'solid', color, onClick: () => resolve(true) },
                ],
                onClose: () => resolve(false),
            });
        });
    }

    // ========== Spinner (variants) ==========
    /**
     * Create a spinner element. Multiple styles.
     * @param {Object} opts
     * @param {string} opts.variant - 'gradient' (Uiverse) | 'dots' | 'ring' | 'bars' | 'orbit'
     * @param {string} opts.size - 'sm'|'md'|'lg' or px number
     * @param {string} opts.color - hex color for single-color variants
     * @param {string} opts.from - gradient start
     * @param {string} opts.to - gradient end
     * @returns {HTMLElement}
     */
    function spinner({ variant = 'ring', size = 'md', color, from, to } = {}) {
        const el = document.createElement('div');
        const px = typeof size === 'number' ? size : ({ sm: 24, md: 36, lg: 56 }[size] || 36);

        if (variant === 'gradient') {
            el.className = 'ui-spinner-wrapper';
            const realSize = ({ sm: 48, md: 72, lg: 100 }[size] || 100);
            el.style.width = realSize + 'px';
            el.style.height = realSize + 'px';
            if (from) el.style.setProperty('--ui-spinner-from', from);
            if (to) el.style.setProperty('--ui-spinner-to', to);
            el.innerHTML = `
                <div class="ui-spinner" style="width:${realSize}px;height:${realSize}px;border-radius:${realSize / 2}px;"></div>
                <div class="ui-spinner-inner" style="width:${realSize}px;height:${realSize}px;border-radius:${realSize / 2}px;"></div>`;
        } else if (variant === 'dots') {
            el.className = 'ui-spinner-dots';
            if (color) el.style.setProperty('--ui-dots-color', color);
            el.innerHTML = `<span></span><span></span><span></span>`;
        } else if (variant === 'bars') {
            el.className = 'ui-spinner-bars';
            el.style.height = px + 'px';
            if (color) el.style.setProperty('--ui-bars-color', color);
            el.innerHTML = `<span></span><span></span><span></span><span></span><span></span>`;
        } else if (variant === 'orbit') {
            el.className = 'ui-spinner-orbit';
            el.style.setProperty('--ui-orbit-size', px + 'px');
            if (from) el.style.setProperty('--ui-orbit-c1', from);
            if (to) el.style.setProperty('--ui-orbit-c2', to);
        } else {
            // Ring (default)
            el.className = 'ui-spinner-ring';
            el.style.setProperty('--ui-ring-size', px + 'px');
            el.style.setProperty('--ui-ring-width', Math.max(2, Math.round(px / 12)) + 'px');
            if (color) el.style.setProperty('--ui-ring-color', color);
        }
        return el;
    }

    // ========== Toggle / Switch ==========
    /**
     * @param {Object} opts
     * @param {string} opts.label
     * @param {boolean} opts.checked
     * @param {string} opts.size - 'sm'|'md'|'lg'
     * @param {string} opts.color - 'primary'|'tertiary'|...|hex
     * @param {Function} opts.onChange - (checked) => void
     * @param {boolean} opts.disabled
     * @param {boolean} opts.labelLeft - Show label before toggle (default: after)
     * @returns {HTMLLabelElement}
     */
    function toggle({ label, checked = false, size = 'md', color = 'primary', onChange, disabled = false, labelLeft = false } = {}) {
        const c = resolveColor(color);
        const el = document.createElement('label');
        el.className = 'ui-toggle' + (size !== 'md' ? ' ui-toggle-' + size : '');
        setVars(el, {
            '--ui-toggle-from': c.from,
            '--ui-toggle-to': c.to,
            '--ui-toggle-shadow': c.shadow,
        });

        const labelHtml = label ? `<span class="ui-toggle-label">${label}</span>` : '';
        const switchHtml = `
            <input type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
            <span class="ui-toggle-track"><span class="ui-toggle-thumb"></span></span>`;

        el.innerHTML = labelLeft ? labelHtml + switchHtml : switchHtml + labelHtml;

        const input = el.querySelector('input');
        if (onChange) input.addEventListener('change', () => onChange(input.checked));

        // Expose getter/setter
        el.getChecked = () => input.checked;
        el.setChecked = (v) => { input.checked = !!v; };
        return el;
    }

    // ========== Dropdown Menu ==========
    /**
     * @param {Object} opts
     * @param {string} opts.label - Trigger button label
     * @param {string} opts.icon - Trigger icon
     * @param {Array} opts.items - [{ label, icon, value, onClick, active, danger, divider, header }]
     * @param {string} opts.align - 'left'|'right'
     * @param {number|string} opts.minWidth
     * @returns {HTMLElement}
     */
    function dropdown({ label = 'Select', icon: iconName, items = [], align = 'left', minWidth } = {}) {
        const el = document.createElement('div');
        el.className = 'ui-dropdown';
        if (minWidth) el.style.minWidth = typeof minWidth === 'number' ? minWidth + 'px' : minWidth;

        const itemsHtml = items.map(item => {
            if (item.divider) return `<div class="ui-dropdown-divider"></div>`;
            if (item.header) return `<div class="ui-dropdown-label">${item.header}</div>`;
            const cls = ['ui-dropdown-item'];
            if (item.active) cls.push('active');
            if (item.danger) cls.push('danger');
            return `<button class="${cls.join(' ')}" data-value="${item.value ?? ''}">
                ${item.icon ? icon(item.icon, 16) : ''}
                <span>${item.label}</span>
            </button>`;
        }).join('');

        el.innerHTML = `
            <button class="ui-dropdown-trigger">
                <span style="display:flex;align-items:center;gap:6px;">
                    ${iconName ? icon(iconName, 16) : ''}
                    <span class="ui-dropdown-label-text">${label}</span>
                </span>
                <span class="material-icons-outlined ui-dropdown-chevron">expand_more</span>
            </button>
            <div class="ui-dropdown-menu ${align === 'right' ? 'align-right' : ''}">${itemsHtml}</div>
        `;

        const trigger = el.querySelector('.ui-dropdown-trigger');
        const menu = el.querySelector('.ui-dropdown-menu');
        const labelEl = el.querySelector('.ui-dropdown-label-text');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.ui-dropdown.open').forEach(d => { if (d !== el) d.classList.remove('open'); });
            el.classList.toggle('open');
        });

        menu.querySelectorAll('.ui-dropdown-item').forEach((itemEl, idx) => {
            const item = items.filter(x => !x.divider && !x.header)[
                [...menu.querySelectorAll('.ui-dropdown-item')].indexOf(itemEl)
            ];
            if (!item) return;
            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                el.classList.remove('open');
                if (item.label) labelEl.textContent = item.label;
                menu.querySelectorAll('.ui-dropdown-item').forEach(x => x.classList.remove('active'));
                itemEl.classList.add('active');
                if (item.onClick) item.onClick(item.value, item);
            });
        });

        document.addEventListener('click', () => el.classList.remove('open'));

        return el;
    }

    // ========== Datetime Picker ==========
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function fmtDate(d, withTime) {
        if (!d) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        if (!withTime) return `${day}/${month}/${year}`;
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hh}:${mm}`;
    }

    /**
     * @param {Object} opts
     * @param {Date} opts.value - Initial date
     * @param {boolean} opts.showTime - Show time picker (default true)
     * @param {string} opts.placeholder
     * @param {string} opts.align - 'left'|'right'
     * @param {Date} opts.min
     * @param {Date} opts.max
     * @param {Function} opts.onChange - (date) => void
     * @returns {HTMLElement}
     */
    function datetime({ value = null, showTime = true, placeholder = 'Select date', align = 'left', min, max, onChange } = {}) {
        const el = document.createElement('div');
        el.className = 'ui-datetime';

        let selected = value ? new Date(value) : null;
        let viewDate = selected ? new Date(selected) : new Date();

        el.innerHTML = `
            <div class="ui-datetime-input">
                <span class="material-icons-outlined">${showTime ? 'event' : 'calendar_today'}</span>
                <span class="ui-datetime-display ${selected ? '' : 'placeholder'}">${selected ? fmtDate(selected, showTime) : placeholder}</span>
            </div>
            <div class="ui-datetime-panel ${align === 'right' ? 'align-right' : ''}" style="${align === 'right' ? 'right:0;left:auto;' : ''}">
                <div class="ui-cal-header">
                    <button class="ui-cal-nav" data-nav="prev">${icon('chevron_left', 20)}</button>
                    <div class="ui-cal-title"></div>
                    <button class="ui-cal-nav" data-nav="next">${icon('chevron_right', 20)}</button>
                </div>
                <div class="ui-cal-grid ui-cal-weekdays">
                    ${WEEKDAYS.map(w => `<div class="ui-cal-weekday">${w}</div>`).join('')}
                </div>
                <div class="ui-cal-grid ui-cal-days"></div>
                ${showTime ? `
                <div class="ui-cal-time">
                    <span class="ui-cal-time-label">Time</span>
                    <input type="number" class="ui-cal-time-input" data-part="hour" min="0" max="23" value="${selected ? String(selected.getHours()).padStart(2, '0') : '09'}">
                    <span class="ui-cal-time-sep">:</span>
                    <input type="number" class="ui-cal-time-input" data-part="minute" min="0" max="59" value="${selected ? String(selected.getMinutes()).padStart(2, '0') : '00'}">
                </div>` : ''}
                <div class="ui-cal-footer">
                    <button class="ui-btn ui-btn-ghost ui-btn-sm" data-action="clear" style="flex:1;">Clear</button>
                    <button class="ui-btn ui-btn-solid ui-btn-sm" data-action="apply" style="flex:1;">Apply</button>
                </div>
            </div>
        `;

        const input = el.querySelector('.ui-datetime-input');
        const panel = el.querySelector('.ui-datetime-panel');
        const title = el.querySelector('.ui-cal-title');
        const daysGrid = el.querySelector('.ui-cal-days');
        const display = el.querySelector('.ui-datetime-display');
        const hourInput = el.querySelector('[data-part="hour"]');
        const minuteInput = el.querySelector('[data-part="minute"]');

        function renderMonth() {
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();
            title.textContent = `${MONTHS[month]} ${year}`;

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const daysPrevMonth = new Date(year, month, 0).getDate();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let html = '';
            // Previous month trailing days
            for (let i = firstDay - 1; i >= 0; i--) {
                const d = daysPrevMonth - i;
                html += `<button class="ui-cal-day other-month" data-date="${year}-${month}-${-d}" disabled>${d}</button>`;
            }
            // Current month
            for (let d = 1; d <= daysInMonth; d++) {
                const cellDate = new Date(year, month, d);
                const iso = `${year}-${month}-${d}`;
                const classes = ['ui-cal-day'];
                if (cellDate.getTime() === today.getTime()) classes.push('today');
                if (selected &&
                    selected.getFullYear() === year &&
                    selected.getMonth() === month &&
                    selected.getDate() === d) classes.push('selected');
                let disabled = '';
                if (min && cellDate < min) disabled = 'disabled';
                if (max && cellDate > max) disabled = 'disabled';
                html += `<button class="${classes.join(' ')}" data-date="${iso}" ${disabled}>${d}</button>`;
            }
            // Next month leading (fill to 42)
            const cellsSoFar = firstDay + daysInMonth;
            const trailing = (7 - (cellsSoFar % 7)) % 7;
            for (let i = 1; i <= trailing; i++) {
                html += `<button class="ui-cal-day other-month" disabled>${i}</button>`;
            }
            daysGrid.innerHTML = html;

            daysGrid.querySelectorAll('.ui-cal-day:not(.other-month):not(:disabled)').forEach(btn => {
                btn.addEventListener('click', () => {
                    const [y, mo, d] = btn.dataset.date.split('-').map(Number);
                    const newDate = new Date(y, mo, d);
                    if (showTime) {
                        newDate.setHours(parseInt(hourInput.value) || 0);
                        newDate.setMinutes(parseInt(minuteInput.value) || 0);
                    }
                    selected = newDate;
                    renderMonth();
                });
            });
        }

        el.querySelector('[data-nav="prev"]').addEventListener('click', (e) => {
            e.stopPropagation();
            viewDate.setMonth(viewDate.getMonth() - 1);
            renderMonth();
        });
        el.querySelector('[data-nav="next"]').addEventListener('click', (e) => {
            e.stopPropagation();
            viewDate.setMonth(viewDate.getMonth() + 1);
            renderMonth();
        });

        input.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.ui-datetime.open').forEach(d => { if (d !== el) d.classList.remove('open'); });
            el.classList.toggle('open');
        });

        el.querySelector('[data-action="clear"]').addEventListener('click', (e) => {
            e.stopPropagation();
            selected = null;
            display.textContent = placeholder;
            display.classList.add('placeholder');
            el.classList.remove('open');
            if (onChange) onChange(null);
        });

        el.querySelector('[data-action="apply"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!selected) selected = new Date();
            if (showTime) {
                selected.setHours(parseInt(hourInput.value) || 0);
                selected.setMinutes(parseInt(minuteInput.value) || 0);
            }
            display.textContent = fmtDate(selected, showTime);
            display.classList.remove('placeholder');
            el.classList.remove('open');
            if (onChange) onChange(selected);
        });

        panel.addEventListener('click', (e) => e.stopPropagation());
        document.addEventListener('click', () => el.classList.remove('open'));

        renderMonth();

        el.getValue = () => selected;
        el.setValue = (d) => {
            selected = d ? new Date(d) : null;
            viewDate = selected ? new Date(selected) : new Date();
            display.textContent = selected ? fmtDate(selected, showTime) : placeholder;
            display.classList.toggle('placeholder', !selected);
            renderMonth();
        };

        return el;
    }

    // ========== Grid / Data Table ==========
    /**
     * Data grid with sorting, pagination, search, selection.
     *
     * @param {Object} opts
     * @param {Array} opts.data - Array of row objects
     * @param {Array} opts.columns - [{ key, label, width, align, sortable, render: (value, row, index) => HTML|string }]
     * @param {number} opts.pageSize - Default 10, 0 = no pagination
     * @param {Array<number>} opts.pageSizeOptions - [10, 25, 50, 100]
     * @param {boolean} opts.searchable - Show search input
     * @param {string} opts.searchPlaceholder
     * @param {boolean} opts.selectable - Row checkboxes
     * @param {Function} opts.onRowClick - (row, index) => void
     * @param {Function} opts.onSelectionChange - (selectedRows) => void
     * @param {Function} opts.onSort - (key, direction) => void
     * @param {string|HTMLElement} opts.toolbar - Custom toolbar content (right side)
     * @param {string} opts.emptyText - Default "No data"
     * @param {string} opts.emptyIcon - Default "inbox"
     * @returns {HTMLElement} with methods: setData, getData, getSelected, setLoading, refresh
     */
    function grid(opts = {}) {
        const config = {
            data: [], columns: [], pageSize: 10, pageSizeOptions: [10, 25, 50, 100],
            searchable: true, searchPlaceholder: 'Search...', selectable: false,
            onRowClick: null, onSelectionChange: null, onSort: null,
            toolbar: '', emptyText: 'No data', emptyIcon: 'inbox',
            ...opts,
        };

        const state = {
            data: [...(config.data || [])],
            filteredData: [],
            currentPage: 1,
            pageSize: config.pageSize || 0,
            sortKey: null,
            sortDir: 'asc',
            search: '',
            selected: new Set(),
            loading: false,
        };

        const el = document.createElement('div');
        el.className = 'ui-grid';

        function renderCell(col, row, rowIdx) {
            const value = row[col.key];
            if (col.render) {
                const rendered = col.render(value, row, rowIdx);
                if (rendered instanceof HTMLElement) return rendered;
                return rendered ?? '';
            }
            return value ?? '';
        }

        function compareValues(a, b) {
            if (a == null && b == null) return 0;
            if (a == null) return -1;
            if (b == null) return 1;
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b));
        }

        function applyFilters() {
            let rows = state.data;
            if (state.search) {
                const q = state.search.toLowerCase();
                rows = rows.filter(r =>
                    config.columns.some(c => {
                        if (c.searchable === false) return false;
                        const v = r[c.key];
                        return v != null && String(v).toLowerCase().includes(q);
                    })
                );
            }
            if (state.sortKey) {
                const sign = state.sortDir === 'asc' ? 1 : -1;
                rows = [...rows].sort((a, b) => sign * compareValues(a[state.sortKey], b[state.sortKey]));
            }
            state.filteredData = rows;
            const totalPages = Math.max(1, Math.ceil(rows.length / (state.pageSize || rows.length || 1)));
            if (state.currentPage > totalPages) state.currentPage = totalPages;
        }

        function render() {
            applyFilters();
            const { filteredData } = state;
            const start = state.pageSize ? (state.currentPage - 1) * state.pageSize : 0;
            const end = state.pageSize ? start + state.pageSize : filteredData.length;
            const pageRows = filteredData.slice(start, end);
            const totalPages = Math.max(1, Math.ceil(filteredData.length / (state.pageSize || filteredData.length || 1)));

            // Header cells
            const headerHtml = `
                ${config.selectable ? `<th style="width:40px;">
                    <input type="checkbox" class="ui-grid-checkbox" data-role="select-all" ${state.selected.size > 0 && state.selected.size === pageRows.length ? 'checked' : ''}>
                </th>` : ''}
                ${config.columns.map(c => {
                    const align = c.align ? `align-${c.align}` : '';
                    const sortable = c.sortable !== false ? 'sortable' : '';
                    const sorted = state.sortKey === c.key ? 'sorted' : '';
                    const sortedDesc = state.sortKey === c.key && state.sortDir === 'desc' ? 'sorted-desc' : '';
                    const width = c.width ? `style="width:${typeof c.width === 'number' ? c.width + 'px' : c.width}"` : '';
                    return `<th class="${align} ${sortable} ${sorted} ${sortedDesc}" data-key="${c.key}" ${width}>
                        ${c.label ?? c.key}
                        ${c.sortable !== false ? `<span class="material-icons-outlined ui-grid-sort-icon">arrow_downward</span>` : ''}
                    </th>`;
                }).join('')}
            `;

            // Body
            let bodyHtml = '';
            if (pageRows.length === 0) {
                const colspan = config.columns.length + (config.selectable ? 1 : 0);
                bodyHtml = `<tr><td colspan="${colspan}">
                    <div class="ui-grid-empty">
                        <div class="ui-grid-empty-icon">${icon(config.emptyIcon, 24)}</div>
                        <div>${config.emptyText}</div>
                    </div>
                </td></tr>`;
            } else {
                bodyHtml = pageRows.map((row, idx) => {
                    const globalIdx = start + idx;
                    const rowKey = row.id ?? row._id ?? globalIdx;
                    const selected = state.selected.has(rowKey);
                    const clickable = config.onRowClick ? 'clickable' : '';
                    return `<tr class="${clickable} ${selected ? 'selected' : ''}" data-row-key="${rowKey}" data-row-index="${globalIdx}">
                        ${config.selectable ? `<td><input type="checkbox" class="ui-grid-checkbox" data-role="select-row" data-key="${rowKey}" ${selected ? 'checked' : ''}></td>` : ''}
                        ${config.columns.map(c => {
                            const align = c.align ? `align-${c.align}` : '';
                            const content = renderCell(c, row, globalIdx);
                            if (content instanceof HTMLElement) {
                                return `<td class="${align}" data-col-key="${c.key}"></td>`;
                            }
                            return `<td class="${align}" data-col-key="${c.key}">${content}</td>`;
                        }).join('')}
                    </tr>`;
                }).join('');
            }

            // Toolbar
            const toolbarHtml = (config.searchable || config.toolbar) ? `
                <div class="ui-grid-toolbar">
                    ${config.searchable ? `
                        <div class="ui-grid-search">
                            <span class="material-icons-outlined">search</span>
                            <input type="text" placeholder="${config.searchPlaceholder}" value="${state.search}">
                        </div>` : '<div class="ui-grid-toolbar-spacer"></div>'}
                    <div class="ui-grid-toolbar-spacer"></div>
                    <div class="ui-grid-toolbar-right"></div>
                </div>` : '';

            // Footer (pagination)
            const footerHtml = state.pageSize ? `
                <div class="ui-grid-footer">
                    <div class="flex items-center gap-3">
                        <span>Showing <strong style="color:#dee5ff;">${filteredData.length === 0 ? 0 : start + 1}–${Math.min(end, filteredData.length)}</strong> of <strong style="color:#dee5ff;">${filteredData.length}</strong></span>
                        ${config.pageSizeOptions && config.pageSizeOptions.length > 1 ? `
                            <select class="ui-grid-page-size" data-role="page-size">
                                ${config.pageSizeOptions.map(o => `<option value="${o}" ${o === state.pageSize ? 'selected' : ''}>${o} / page</option>`).join('')}
                            </select>` : ''}
                    </div>
                    <div class="flex items-center gap-1" data-role="pagination">
                        ${renderPageButtons(totalPages)}
                    </div>
                </div>` : '';

            el.innerHTML = `
                ${toolbarHtml}
                <div class="ui-grid-body-wrap">
                    <table class="ui-grid-table">
                        <thead><tr>${headerHtml}</tr></thead>
                        <tbody>${bodyHtml}</tbody>
                    </table>
                </div>
                ${footerHtml}
                ${state.loading ? `<div class="ui-grid-loading-overlay"></div>` : ''}
            `;

            // Mount HTMLElement render() outputs
            pageRows.forEach((row, idx) => {
                const globalIdx = start + idx;
                config.columns.forEach(c => {
                    if (!c.render) return;
                    const result = c.render(row[c.key], row, globalIdx);
                    if (result instanceof HTMLElement) {
                        const cell = el.querySelector(`tr[data-row-index="${globalIdx}"] td[data-col-key="${c.key}"]`);
                        if (cell) cell.appendChild(result);
                    }
                });
            });

            // Toolbar custom content
            if (config.toolbar) {
                const right = el.querySelector('.ui-grid-toolbar-right');
                if (right) {
                    if (config.toolbar instanceof HTMLElement) right.appendChild(config.toolbar);
                    else right.innerHTML = config.toolbar;
                }
            }

            if (state.loading) {
                const overlay = el.querySelector('.ui-grid-loading-overlay');
                if (overlay) overlay.appendChild(spinner({ variant: 'gradient', size: 'sm' }));
            }

            attachHandlers();
        }

        function renderPageButtons(totalPages) {
            if (totalPages <= 1) return '';
            const pages = [];
            if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                if (state.currentPage > 3) pages.push('...');
                for (let i = Math.max(2, state.currentPage - 1); i <= Math.min(totalPages - 1, state.currentPage + 1); i++) pages.push(i);
                if (state.currentPage < totalPages - 2) pages.push('...');
                pages.push(totalPages);
            }
            return `
                <button class="ui-grid-page-btn" data-page="prev" ${state.currentPage === 1 ? 'disabled' : ''}>${icon('chevron_left', 16)}</button>
                ${pages.map(p => p === '...'
                    ? `<span style="padding:0 4px;color:#4a5273;">…</span>`
                    : `<button class="ui-grid-page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
                ).join('')}
                <button class="ui-grid-page-btn" data-page="next" ${state.currentPage === totalPages ? 'disabled' : ''}>${icon('chevron_right', 16)}</button>
            `;
        }

        function attachHandlers() {
            // Sort
            el.querySelectorAll('th.sortable').forEach(th => {
                th.addEventListener('click', () => {
                    const key = th.dataset.key;
                    if (state.sortKey === key) {
                        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        state.sortKey = key;
                        state.sortDir = 'asc';
                    }
                    if (config.onSort) config.onSort(state.sortKey, state.sortDir);
                    render();
                });
            });

            // Row click
            if (config.onRowClick) {
                el.querySelectorAll('tbody tr[data-row-key]').forEach(tr => {
                    tr.addEventListener('click', (e) => {
                        if (e.target.closest('.ui-grid-checkbox, button, a')) return;
                        const idx = parseInt(tr.dataset.rowIndex);
                        config.onRowClick(state.filteredData[idx], idx);
                    });
                });
            }

            // Search
            const search = el.querySelector('.ui-grid-search input');
            if (search) {
                let t;
                search.addEventListener('input', (e) => {
                    const cursorPos = e.target.selectionStart;
                    const value = e.target.value;
                    clearTimeout(t);
                    t = setTimeout(() => {
                        state.search = value;
                        state.currentPage = 1;
                        render();
                        const newInput = el.querySelector('.ui-grid-search input');
                        if (newInput) {
                            newInput.focus();
                            newInput.setSelectionRange(cursorPos, cursorPos);
                        }
                    }, 150);
                });
            }

            // Pagination
            el.querySelectorAll('[data-page]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const p = btn.dataset.page;
                    if (p === 'prev') state.currentPage = Math.max(1, state.currentPage - 1);
                    else if (p === 'next') state.currentPage++;
                    else state.currentPage = parseInt(p);
                    render();
                });
            });

            // Page size
            const sizeSel = el.querySelector('[data-role="page-size"]');
            if (sizeSel) {
                sizeSel.addEventListener('change', (e) => {
                    state.pageSize = parseInt(e.target.value);
                    state.currentPage = 1;
                    render();
                });
            }

            // Select all
            const selectAll = el.querySelector('[data-role="select-all"]');
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    const start = (state.currentPage - 1) * (state.pageSize || state.filteredData.length);
                    const end = state.pageSize ? start + state.pageSize : state.filteredData.length;
                    const pageRows = state.filteredData.slice(start, end);
                    if (e.target.checked) {
                        pageRows.forEach(r => state.selected.add(r.id ?? r._id ?? state.filteredData.indexOf(r)));
                    } else {
                        pageRows.forEach(r => state.selected.delete(r.id ?? r._id ?? state.filteredData.indexOf(r)));
                    }
                    notifySelection();
                    render();
                });
            }

            // Row checkboxes
            el.querySelectorAll('[data-role="select-row"]').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    e.stopPropagation();
                    const key = cb.dataset.key;
                    const keyNum = isNaN(+key) ? key : +key;
                    if (cb.checked) state.selected.add(keyNum);
                    else state.selected.delete(keyNum);
                    notifySelection();
                    render();
                });
            });
        }

        function notifySelection() {
            if (!config.onSelectionChange) return;
            const rows = state.data.filter(r => state.selected.has(r.id ?? r._id));
            config.onSelectionChange(rows);
        }

        // Public methods
        el.setData = (newData) => {
            state.data = [...(newData || [])];
            state.selected.clear();
            state.currentPage = 1;
            render();
        };
        el.getData = () => state.data;
        el.getSelected = () => state.data.filter(r => state.selected.has(r.id ?? r._id));
        el.clearSelection = () => { state.selected.clear(); render(); };
        el.setLoading = (v) => { state.loading = !!v; render(); };
        el.refresh = render;
        el.setSort = (key, dir = 'asc') => { state.sortKey = key; state.sortDir = dir; render(); };
        el.setSearch = (q) => { state.search = q; state.currentPage = 1; render(); };
        el.goToPage = (p) => { state.currentPage = p; render(); };

        render();
        return el;
    }

    // ========== Theme ==========
    const theme = {
        /**
         * Set the global theme.
         * @param {'light' | 'dark' | 'auto'} mode - 'auto' follows system preference
         * @param {HTMLElement} target - Element to apply class (default: document.documentElement)
         */
        set(mode = 'dark', target) {
            const el = target || document.documentElement;
            el.classList.remove('ui-light', 'ui-dark');
            if (mode === 'auto') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                el.classList.add(prefersDark ? 'ui-dark' : 'ui-light');
            } else {
                el.classList.add('ui-' + mode);
            }
            localStorage.setItem('ui-theme', mode);
        },

        /**
         * Toggle between light and dark.
         * @param {HTMLElement} target
         * @returns {'light' | 'dark'} new mode
         */
        toggle(target) {
            const el = target || document.documentElement;
            const isLight = el.classList.contains('ui-light');
            this.set(isLight ? 'dark' : 'light', target);
            return isLight ? 'dark' : 'light';
        },

        /** Get current mode */
        get() {
            if (document.documentElement.classList.contains('ui-light')) return 'light';
            return 'dark';
        },

        /** Initialize theme from localStorage or default */
        init(defaultMode = 'dark') {
            const saved = localStorage.getItem('ui-theme');
            this.set(saved || defaultMode);
        },
    };

    // ========== Public API ==========
    return { loading, spinner, button, card, alert, dialog, confirm, toggle, dropdown, datetime, grid, theme };
})();

if (typeof window !== 'undefined') window.UI = UI;
