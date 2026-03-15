import './style.css';
import type { OptionsState } from '../../lib/types';
import { DEFAULT_OPTIONS } from '../../lib/types';

const STORAGE_KEY = 'cwv-live-options';
const LCP_MAX = 4000;
const INP_MAX = 500;
const CLS_MAX = 0.25;

interface MetricPayload {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  label: string;
}

interface MetricsPayload {
  LCP?: MetricPayload | null;
  INP?: MetricPayload | null;
  CLS?: MetricPayload | null;
}

function fillPercent(value: number, max: number, invert = false): number {
  const p = Math.min(100, Math.round((value / max) * 100));
  return invert ? 100 - p : p;
}

function renderMetric(
  name: string,
  m: MetricPayload | null | undefined,
  max: number,
  invert: boolean
): string {
  if (!m) {
    return `
      <div class="metric unknown" data-metric="${name}">
        <span class="metric-name">${name}</span>
        <span class="metric-value">—</span>
        <div class="metric-bar-wrap"><div class="metric-bar-fill" style="width: 0%"></div></div>
        <span class="metric-rating">—</span>
      </div>`;
  }
  const rating = m.rating.replace('-', '-');
  const fill = fillPercent(m.value, max, invert);
  const ratingLabel =
    m.rating === 'good'
      ? 'Good'
      : m.rating === 'needs-improvement'
        ? 'Needs work'
        : 'Poor';
  return `
    <div class="metric ${rating}" data-metric="${name}">
      <span class="metric-name">${name}</span>
      <span class="metric-value">${m.label}</span>
      <div class="metric-bar-wrap"><div class="metric-bar-fill" style="width: ${fill}%"></div></div>
      <span class="metric-rating">${ratingLabel}</span>
    </div>`;
}

async function loadMetrics(tabId: number): Promise<MetricsPayload | null> {
  const data = await browser.storage.local.get('metrics');
  const metrics = (data.metrics as Record<number, MetricsPayload>) ?? {};
  return metrics[tabId] ?? null;
}

async function loadOptions(): Promise<OptionsState> {
  const data = await browser.storage.sync.get(STORAGE_KEY);
  const stored = data[STORAGE_KEY];
  return { ...DEFAULT_OPTIONS, ...(typeof stored === 'object' && stored ? stored : {}) };
}

async function saveOptions(options: OptionsState): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: options });
}

function render(
  metrics: MetricsPayload | null,
  options: OptionsState,
  throttled: boolean,
  tabId: number | null
): void {
  const app = document.getElementById('app')!;
  const hasAny =
    metrics?.LCP ?? metrics?.INP ?? metrics?.CLS ? true : false;

  app.innerHTML = `
    <h1>Core Web Vitals Live</h1>
    ${
      hasAny
        ? `
    ${renderMetric('LCP', metrics?.LCP ?? null, LCP_MAX, true)}
    ${renderMetric('INP', metrics?.INP ?? null, INP_MAX, true)}
    ${renderMetric('CLS', metrics?.CLS ?? null, CLS_MAX, true)}`
        : `
    <p class="empty">Open a webpage to see live Core Web Vitals (LCP, INP, CLS).</p>`
    }

    <section class="section">
      <label class="toggle-row">
        <input type="checkbox" id="throttle" class="toggle-input" ${throttled ? 'checked' : ''} />
        <span class="toggle-label">Emulate slower device</span>
      </label>
      <p class="section-desc">4× CPU slowdown + Fast 4G network. A yellow browser bar will appear — this is normal and required for throttling.</p>
    </section>

    <section class="section">
      <h2 class="section-title">Visualizations</h2>
      <label class="toggle-row">
        <input type="checkbox" id="cls" class="toggle-input" ${options.clsVizEnabled ? 'checked' : ''} />
        <span class="toggle-label">CLS (layout shifts)</span>
      </label>
      <label class="toggle-row">
        <input type="checkbox" id="inp" class="toggle-input" ${options.inpVizEnabled ? 'checked' : ''} />
        <span class="toggle-label">INP (interactions)</span>
      </label>
      <label class="toggle-row">
        <input type="checkbox" id="lcp" class="toggle-input" ${options.lcpVizEnabled ? 'checked' : ''} />
        <span class="toggle-label">LCP (largest content)</span>
      </label>
    </section>
  `;

  const throttleEl = document.getElementById('throttle') as HTMLInputElement;
  throttleEl.addEventListener('change', async () => {
    const enabled = throttleEl.checked;
    if (tabId == null) return;
    const res = await browser.runtime.sendMessage({
      type: 'TOGGLE_THROTTLING',
      tabId,
      enabled,
    });
    if (res?.ok !== true && enabled && res?.error) {
      throttleEl.checked = false;
    }
    await saveOptions({ ...options, throttlingEnabled: enabled });
  });

  function getOptionsFromDOM(): OptionsState {
    return {
      clsVizEnabled: (document.getElementById('cls') as HTMLInputElement).checked,
      inpVizEnabled: (document.getElementById('inp') as HTMLInputElement).checked,
      lcpVizEnabled: (document.getElementById('lcp') as HTMLInputElement).checked,
      throttlingEnabled: (document.getElementById('throttle') as HTMLInputElement).checked,
    };
  }

  function onVizChange() {
    const next = getOptionsFromDOM();
    saveOptions(next).then(() => {
      if (tabId != null) {
        browser.tabs.sendMessage(tabId, { type: 'ACTIVATE' }).catch(() => {});
      }
    });
  }

  (document.getElementById('cls') as HTMLInputElement).addEventListener('change', onVizChange);
  (document.getElementById('inp') as HTMLInputElement).addEventListener('change', onVizChange);
  (document.getElementById('lcp') as HTMLInputElement).addEventListener('change', onVizChange);
}

async function main(): Promise<void> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tabId = tab?.id ?? null;

  if (tabId != null) {
    browser.tabs.sendMessage(tabId, { type: 'ACTIVATE' }).catch(() => {});
  }

  const [metrics, options, throttlingState] = await Promise.all([
    tabId != null ? loadMetrics(tabId) : Promise.resolve(null),
    loadOptions(),
    tabId != null
      ? browser.runtime.sendMessage({ type: 'GET_THROTTLING_STATE', tabId })
      : Promise.resolve({ throttled: false }),
  ]);

  const throttled = (throttlingState as { throttled?: boolean })?.throttled ?? options.throttlingEnabled;

  render(metrics, options, throttled, tabId);
}

main();
