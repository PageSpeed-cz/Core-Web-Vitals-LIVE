// HUD rendered in extension-origin iframe.
// Communicates with the parent content script via postMessage.

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

// Basic markup: parent handles all business logic. This file just renders + sends events.
root.innerHTML = `
  <div class="hud">
    <div class="header">
      <div class="title">CORE WEB VITALS LIVE</div>
      <button class="iconbtn" data-close aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div class="rows">
      ${['LCP', 'INP', 'CLS']
        .map(
          (k) => `
        <div class="row" data-metric="${k}">
          <div class="rowhead">
            <div class="name">${k}</div>
            <div class="value">—</div>
          </div>
        </div>`
        )
        .join('')}
    </div>

    <div class="optionsWrap">
      <button class="optionsToggle" type="button">
        <span>Show options</span>
        <span class="chev">▾</span>
      </button>
      <div class="options" hidden>
        <label class="optRow">
          <span>Emulate slower device</span>
          <input type="checkbox" id="throttle" />
        </label>
        <label class="optRow">
          <span>Visualize CLS</span>
          <input type="checkbox" id="cls" />
        </label>
        <label class="optRow">
          <span>Visualize INP</span>
          <input type="checkbox" id="inp" />
        </label>
        <label class="optRow">
          <span>Visualize LCP</span>
          <input type="checkbox" id="lcp" />
        </label>
      </div>
    </div>
  </div>
`;

function post(type, payload = {}) {
  window.parent.postMessage({ source: 'cwv-live-hud', type, ...payload }, '*');
}

root.querySelector('[data-close]')?.addEventListener('click', (e) => {
  e.preventDefault();
  post('HUD_CLOSE');
});

const toggle = root.querySelector('.optionsToggle');
const options = root.querySelector('.options');
toggle?.addEventListener('click', () => {
  const next = options.hasAttribute('hidden');
  if (next) options.removeAttribute('hidden');
  else options.setAttribute('hidden', '');
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

const throttle = wireCheckbox('throttle', 'throttlingEnabled');
const cls = wireCheckbox('cls', 'clsVizEnabled');
const inp = wireCheckbox('inp', 'inpVizEnabled');
const lcp = wireCheckbox('lcp', 'lcpVizEnabled');

function render() {
  // checkbox states
  throttle.checked = !!state.ui.throttled;
  cls.checked = !!state.ui.options.clsVizEnabled;
  inp.checked = !!state.ui.options.inpVizEnabled;
  lcp.checked = !!state.ui.options.lcpVizEnabled;
  if (state.ui.options.hudOptionsExpanded) options.removeAttribute('hidden');
  else options.setAttribute('hidden', '');

  for (const k of ['LCP', 'INP', 'CLS']) {
    const row = root.querySelector(`[data-metric="${k}"]`);
    const value = row?.querySelector('.value');
    const m = state.metrics[k];
    if (value) value.textContent = m?.label ?? '—';
  }
}

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.source !== 'cwv-live-parent') return;
  if (msg.type === 'HUD_STATE') {
    if (msg.metrics) state.metrics = msg.metrics;
    if (msg.ui) state.ui = msg.ui;
    render();
  }
});

post('HUD_READY');
render();

