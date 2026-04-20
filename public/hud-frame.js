// HUD rendered in extension-origin iframe (CSP-proof fonts).
// Communicates with the parent content script via postMessage.

const PREFIX = 'cwv-live';
const TOTAL_SQUARES = 10;

const EXTENSION_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="64 64 512 512" fill="none" aria-hidden="true"><path fill="currentColor" d="M64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM384 416C384 389.1 367.5 366.1 344 356.7L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184L296 356.7C272.5 366.2 256 389.2 256 416C256 451.3 284.7 480 320 480C355.3 480 384 451.3 384 416zM208 240C225.7 240 240 225.7 240 208C240 190.3 225.7 176 208 176C190.3 176 176 190.3 176 208C176 225.7 190.3 240 208 240zM192 320C192 302.3 177.7 288 160 288C142.3 288 128 302.3 128 320C128 337.7 142.3 352 160 352C177.7 352 192 337.7 192 320zM480 352C497.7 352 512 337.7 512 320C512 302.3 497.7 288 480 288C462.3 288 448 302.3 448 320C448 337.7 462.3 352 480 352zM464 208C464 190.3 449.7 176 432 176C414.3 176 400 190.3 400 208C400 225.7 414.3 240 432 240C449.7 240 464 225.7 464 208z"/></svg>`;

const PAGESPEED_MARK_SVG = `<svg viewBox="50 50 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M100 150C127.613 150 150 127.615 150 100C150 72.3849 127.613 50 100 50C72.387 50 50 72.3849 50 100C50 127.615 72.3849 150 100 150Z" fill="currentColor"/><path d="M90.9479 103.006L91.855 87.9079L117.152 89.3971L90.9479 103.006ZM129.954 92.1142C129.954 87.3428 128.408 83.5804 125.285 80.8591C122.16 78.1377 117.658 76.7611 111.744 76.7611H75.1232L70.9232 124.94H88.764L89.9069 111.468H108.689C115.24 111.468 120.447 109.721 124.246 106.261C128.042 102.8 129.958 98.0625 129.958 92.1163" fill="white"/></svg>`;

const ICON_XMARK = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`;
const ICON_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" /></svg>`;

const METRIC_NAMES = { LCP: 'Loading', INP: 'Interactivity', CLS: 'Stability' };
const METRIC_MAX = { LCP: 6000, INP: 600, CLS: 0.5 };
const METRIC_THRESHOLDS = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25] };

const COLORS = {
  good: '#0CCE6B',
  'needs-improvement': '#FFA400',
  poor: '#FF4E42',
};

const root = document.getElementById('root');

const state = {
  metrics: { LCP: null, INP: null, CLS: null },
  ui: {
    throttled: false,
    options: {
      clsVizEnabled: true,
      inpVizEnabled: true,
      lcpVizEnabled: true,
      throttlingEnabled: false,
      hudOptionsExpanded: false,
    },
  },
};

root.innerHTML = `
  <div class="${PREFIX}-hud">
    <div class="${PREFIX}-header" data-drag-handle>
      <div class="${PREFIX}-header-left">
        <span class="${PREFIX}-logo" aria-hidden="true">${EXTENSION_MARK_SVG}</span>
        <span class="${PREFIX}-title">Core Web Vitals Live</span>
      </div>
      <div class="${PREFIX}-header-right">
        <button type="button" class="${PREFIX}-iconbtn" data-close aria-label="Close">${ICON_XMARK}</button>
      </div>
    </div>

    <div class="${PREFIX}-bars">
      ${['LCP', 'INP', 'CLS']
        .map(
          (k) => `
        <div class="${PREFIX}-row" data-metric="${k}">
          <div class="${PREFIX}-row-header">
            <span class="${PREFIX}-name">${METRIC_NAMES[k]} <span class="${PREFIX}-abbr">(${k})</span></span>
            <span class="${PREFIX}-value">—</span>
          </div>
          <div class="${PREFIX}-squares">
            ${Array.from({ length: TOTAL_SQUARES })
              .map(() => `<span class="${PREFIX}-sq"></span>`)
              .join('')}
          </div>
        </div>`
        )
        .join('')}
    </div>

    <div class="${PREFIX}-divider"></div>

    <div class="${PREFIX}-options-panel">
      <button class="${PREFIX}-options-toggle" type="button">
        <span>Show options</span>
        <span class="${PREFIX}-chev">${ICON_CHEVRON}</span>
      </button>
      <div class="${PREFIX}-options" ${state.ui.options.hudOptionsExpanded ? '' : 'hidden'}>
        <div class="${PREFIX}-opt-section">
          <label class="${PREFIX}-opt-row">
            <div class="${PREFIX}-opt-label">
              <strong>Emulate slower device</strong>
              <div class="${PREFIX}-opt-desc">4× CPU slowdown + Fast 4G network. A yellow browser bar will appear — this is normal and required for throttling.</div>
            </div>
            <div class="${PREFIX}-switch">
              <input type="checkbox" id="${PREFIX}-throttle" />
              <span class="${PREFIX}-track"><span class="${PREFIX}-thumb"></span></span>
            </div>
          </label>
        </div>

        <div class="${PREFIX}-opt-section">
          <label class="${PREFIX}-opt-row">
            <div class="${PREFIX}-opt-label"><strong>Visualize CLS</strong></div>
            <div class="${PREFIX}-switch">
              <input type="checkbox" id="${PREFIX}-cls" />
              <span class="${PREFIX}-track"><span class="${PREFIX}-thumb"></span></span>
            </div>
          </label>
          <label class="${PREFIX}-opt-row">
            <div class="${PREFIX}-opt-label"><strong>Visualize INP</strong></div>
            <div class="${PREFIX}-switch">
              <input type="checkbox" id="${PREFIX}-inp" />
              <span class="${PREFIX}-track"><span class="${PREFIX}-thumb"></span></span>
            </div>
          </label>
          <label class="${PREFIX}-opt-row">
            <div class="${PREFIX}-opt-label"><strong>Visualize LCP</strong></div>
            <div class="${PREFIX}-switch">
              <input type="checkbox" id="${PREFIX}-lcp" />
              <span class="${PREFIX}-track"><span class="${PREFIX}-thumb"></span></span>
            </div>
          </label>
        </div>
      </div>
    </div>

    <div class="${PREFIX}-footer">
      <div class="${PREFIX}-footer-links">
        <a href="#" data-testlink>Test your site speed</a>
        <span class="${PREFIX}-sep">—</span>
        <a href="#" data-homelink>Home</a>
        <span class="${PREFIX}-sep">—</span>
        <a href="#" data-privlink>Privacy</a>
      </div>
      <a class="${PREFIX}-byline" href="#" data-pagespeedlink>
        <span class="${PREFIX}-psmark" aria-hidden="true">${PAGESPEED_MARK_SVG}</span>
        <span class="${PREFIX}-byline-text">Brought to you by PageSpeed.ONE</span>
      </a>
    </div>
  </div>
`;

function post(type, payload = {}) {
  window.parent.postMessage({ source: 'cwv-live-hud', type, ...payload }, '*');
}

// Drag handle -> parent moves the iframe wrapper.
{
  const handle = root.querySelector('[data-drag-handle]');
  let dragging = false;
  let pointerId = null;

  const onMove = (e) => {
    if (!dragging) return;
    post('HUD_DRAG_MOVE', { clientX: e.clientX, clientY: e.clientY });
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    try {
      if (pointerId != null) handle.releasePointerCapture(pointerId);
    } catch {}
    pointerId = null;
    post('HUD_DRAG_END');
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
  };

  handle?.addEventListener('pointerdown', (e) => {
    // Don't start drag when interacting with buttons inside the header.
    if (e.target?.closest?.('button, a, input, label')) return;
    dragging = true;
    pointerId = e.pointerId;
    try {
      handle.setPointerCapture(pointerId);
    } catch {}
    post('HUD_DRAG_START', { clientX: e.clientX, clientY: e.clientY });
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    e.preventDefault();
  });
}

root.querySelector('[data-close]')?.addEventListener('click', (e) => {
  e.preventDefault();
  post('HUD_CLOSE');
});

const toggle = root.querySelector(`.${PREFIX}-options-toggle`);
const options = root.querySelector(`.${PREFIX}-options`);
toggle?.addEventListener('click', () => {
  const next = options.hasAttribute('hidden');
  if (next) options.removeAttribute('hidden');
  else options.setAttribute('hidden', '');
  root.querySelector(`.${PREFIX}-hud`)?.classList.toggle(`${PREFIX}-options-open`, next);
  post('HUD_OPTIONS_EXPANDED', { expanded: next });
});

function wireCheckbox(id, key) {
  const el = root.querySelector(`#${id}`);
  el?.addEventListener('change', () => {
    post('HUD_SET_OPTION', { partial: { [key]: !!el.checked } });
    if (key === 'throttlingEnabled') post('HUD_TOGGLE_THROTTLING', { enabled: !!el.checked });
  });
  return el;
}

const throttle = wireCheckbox(`${PREFIX}-throttle`, 'throttlingEnabled');
const cls = wireCheckbox(`${PREFIX}-cls`, 'clsVizEnabled');
const inp = wireCheckbox(`${PREFIX}-inp`, 'inpVizEnabled');
const lcp = wireCheckbox(`${PREFIX}-lcp`, 'lcpVizEnabled');

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function squareColor(index, thresholds, maxValue) {
  const midpoint = ((index + 0.5) / TOTAL_SQUARES) * maxValue;
  if (midpoint <= thresholds[0]) return COLORS.good;
  if (midpoint <= thresholds[1]) return COLORS['needs-improvement'];
  return COLORS.poor;
}

function filledCount(value, maxValue) {
  return Math.min(TOTAL_SQUARES, Math.max(0, Math.round((value / maxValue) * TOTAL_SQUARES)));
}

function render() {
  // checkbox states
  throttle.checked = !!state.ui.throttled;
  cls.checked = !!state.ui.options.clsVizEnabled;
  inp.checked = !!state.ui.options.inpVizEnabled;
  lcp.checked = !!state.ui.options.lcpVizEnabled;
  if (state.ui.options.hudOptionsExpanded) options.removeAttribute('hidden');
  else options.setAttribute('hidden', '');
  root.querySelector(`.${PREFIX}-hud`)?.classList.toggle(`${PREFIX}-options-open`, !!state.ui.options.hudOptionsExpanded);

  for (const k of ['LCP', 'INP', 'CLS']) {
    const row = root.querySelector(`[data-metric="${k}"]`);
    const value = row?.querySelector(`.${PREFIX}-value`);
    const m = state.metrics[k];
    if (value) value.textContent = m?.label ?? '—';

    const thresholds = METRIC_THRESHOLDS[k];
    const maxValue = METRIC_MAX[k];
    const filled = m?.value != null ? filledCount(m.value, maxValue) : 0;
    const squares = row?.querySelectorAll(`.${PREFIX}-sq`) ?? [];
    for (let i = 0; i < squares.length; i++) {
      const sq = squares[i];
      const color = squareColor(i, thresholds, maxValue);
      if (m && i < filled) {
        sq.style.background = color;
        sq.style.borderColor = color;
      } else {
        sq.style.background = hexToRgba(color, 0.12);
        sq.style.borderColor = hexToRgba(color, 0.2);
      }
    }

    row?.classList.remove(`${PREFIX}-good`, `${PREFIX}-needs-improvement`, `${PREFIX}-poor`);
    if (m?.rating) row?.classList.add(`${PREFIX}-${m.rating}`);
    if (m?.rating && value) value.style.color = COLORS[m.rating];
  }
}

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.source !== 'cwv-live-parent') return;
  if (msg.type === 'HUD_STATE') {
    if (msg.metrics) state.metrics = msg.metrics;
    if (msg.ui) state.ui = msg.ui;
    if (msg.urls) {
      root.querySelector('[data-testlink]')?.setAttribute('href', msg.urls.test ?? '#');
      root.querySelector('[data-homelink]')?.setAttribute('href', msg.urls.home ?? '#');
      root.querySelector('[data-privlink]')?.setAttribute('href', msg.urls.privacy ?? '#');
      root.querySelector('[data-pagespeedlink]')?.setAttribute('href', msg.urls.pagespeed ?? '#');
    }
    render();
  }
});

// Report size to parent so it can resize the iframe and avoid scrollbars.
{
  const hud = root.querySelector(`.${PREFIX}-hud`);
  let raf = 0;
  const report = () => {
    raf = 0;
    if (!hud) return;
    // scrollHeight is stable even with overflow hidden; add 1px buffer to avoid rounding scrollbars.
    const h = Math.ceil(hud.scrollHeight) + 1;
    const w = Math.ceil(hud.getBoundingClientRect().width) || 360;
    post('HUD_SIZE', { width: w, height: h });
  };

  const ro = new ResizeObserver(() => {
    if (raf) return;
    raf = requestAnimationFrame(report);
  });
  if (hud) ro.observe(hud);
  // Initial
  report();
}

post('HUD_READY');
render();

