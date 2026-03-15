import './style.css';

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

async function loadMetrics(): Promise<MetricsPayload | null> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id) return null;
  const data = await browser.storage.local.get('metrics');
  const metrics = (data.metrics as Record<number, MetricsPayload>) ?? {};
  return metrics[tab.id] ?? null;
}

function render(metrics: MetricsPayload | null): void {
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
    ${renderMetric('CLS', metrics?.CLS ?? null, CLS_MAX, true)}
    <div class="actions">
      <button type="button" id="reload">Reload page</button>
      <button type="button" id="options" class="primary">Options</button>
    </div>`
        : `
    <p class="empty">Open a webpage to see live Core Web Vitals (LCP, INP, CLS).</p>
    <div class="actions">
      <button type="button" id="options" class="primary">Options</button>
    </div>`
    }
  `;

  const reloadBtn = document.getElementById('reload');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', async () => {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) browser.tabs.reload(tab.id);
      window.close();
    });
  }

  const optionsBtn = document.getElementById('options');
  if (optionsBtn) {
    optionsBtn.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
      window.close();
    });
  }
}

loadMetrics().then(render);
