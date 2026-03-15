/**
 * Core Web Vitals Live – game-like HUD overlay with life bars for LCP, INP, CLS.
 */

import type { MetricsState, MetricState, MetricRating } from './types';
import { LCP_THRESHOLDS, INP_THRESHOLDS, CLS_THRESHOLDS } from './types';

const HUD_ID = 'cwv-live-hud';
const PREFIX = 'cwv-live';

/** Return fill percentage (0–100) for a "life" bar: higher = better. */
function fillPercent(
  value: number,
  thresholds: [number, number],
  maxValue: number
): number {
  if (value <= thresholds[0]) return 100;
  if (value >= maxValue) return 0;
  const goodEnd = thresholds[0];
  const range = maxValue - goodEnd;
  const over = value - goodEnd;
  return Math.round(100 - (over / range) * 100);
}

function ratingClass(rating: MetricRating): string {
  return `${PREFIX}-${rating.replace('-', '-')}`;
}

const STYLES = `
.${HUD_ID} {
  position: fixed;
  z-index: 2147483646;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  font-size: 12px;
  line-height: 1.3;
  min-width: 200px;
  max-width: 280px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(20, 22, 28, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  user-select: none;
  pointer-events: auto;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.${HUD_ID}.${PREFIX}-minimized {
  opacity: 0.6;
  transform: scale(0.92);
}
.${HUD_ID}.${PREFIX}-minimized .${PREFIX}-bars { display: none; }
.${HUD_ID} .${PREFIX}-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  cursor: grab;
}
.${HUD_ID} .${PREFIX}-header:active {
  cursor: grabbing;
}
.${HUD_ID} .${PREFIX}-title {
  color: rgba(255,255,255,0.95);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.${HUD_ID} .${PREFIX}-toggle {
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  padding: 2px 6px;
  font-size: 14px;
  line-height: 1;
  border-radius: 4px;
}
.${HUD_ID} .${PREFIX}-toggle:hover {
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.1);
}
.${HUD_ID} .${PREFIX}-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.${HUD_ID} .${PREFIX}-row:last-child { margin-bottom: 0; }
.${HUD_ID} .${PREFIX}-icon { font-size: 14px; width: 20px; text-align: center; }
.${HUD_ID} .${PREFIX}-name { color: rgba(255,255,255,0.7); width: 32px; }
.${HUD_ID} .${PREFIX}-value { color: rgba(255,255,255,0.95); min-width: 42px; font-variant-numeric: tabular-nums; }
.${HUD_ID} .${PREFIX}-bar-wrap {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.12);
  border-radius: 3px;
  overflow: hidden;
}
.${HUD_ID} .${PREFIX}-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.25s ease, background 0.2s ease;
}
.${HUD_ID} .${PREFIX}-good .${PREFIX}-bar-fill { background: #0CCE6B; }
.${HUD_ID} .${PREFIX}-needs-improvement .${PREFIX}-bar-fill { background: #FFA400; }
.${HUD_ID} .${PREFIX}-poor .${PREFIX}-bar-fill { background: #FF4E42; }
.${HUD_ID} .${PREFIX}-row.${PREFIX}-worsen .${PREFIX}-bar-fill {
  animation: ${PREFIX}-shake 0.4s ease;
}
@keyframes ${PREFIX}-shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
.${HUD_ID} .${PREFIX}-rating {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  min-width: 60px;
  text-align: right;
}
.${HUD_ID} .${PREFIX}-good .${PREFIX}-rating { color: #0CCE6B; }
.${HUD_ID} .${PREFIX}-needs-improvement .${PREFIX}-rating { color: #FFA400; }
.${HUD_ID} .${PREFIX}-poor .${PREFIX}-rating { color: #FF4E42; }
@media (max-width: 480px) {
  .${HUD_ID} { font-size: 11px; min-width: 160px; max-width: 220px; padding: 8px 10px; }
  .${HUD_ID} .${PREFIX}-name { width: 28px; }
  .${HUD_ID} .${PREFIX}-value { min-width: 36px; }
}
`;

const ICONS = { LCP: '🛡', INP: '⚡', CLS: '⚖' } as const;
const RATING_LABELS: Record<MetricRating, string> = {
  good: 'Good',
  'needs-improvement': 'Needs work',
  poor: 'Poor',
};

let state: Partial<MetricsState> = {};
let lastRating: Partial<Record<string, MetricRating>> = {};

const HUD_DEFAULT_STYLE = 'top: 16px; right: 16px;';

export function createHUD(): HTMLElement {
  const existing = document.getElementById(HUD_ID);
  if (existing) return existing;

  const wrap = document.createElement('div');
  wrap.id = HUD_ID;
  wrap.className = HUD_ID;
  wrap.setAttribute('style', HUD_DEFAULT_STYLE);

  const style = document.createElement('style');
  style.textContent = STYLES;
  wrap.appendChild(style);

  const header = document.createElement('div');
  header.className = `${PREFIX}-header`;
  header.innerHTML = `
    <span class="${PREFIX}-title">Core Web Vitals</span>
    <button type="button" class="${PREFIX}-toggle" aria-label="Minimize">−</button>
  `;
  wrap.appendChild(header);

  const bars = document.createElement('div');
  bars.className = `${PREFIX}-bars`;
  const metricNames: ('LCP' | 'INP' | 'CLS')[] = ['LCP', 'INP', 'CLS'];
  for (const name of metricNames) {
    const row = document.createElement('div');
    row.className = `${PREFIX}-row`;
    row.dataset.metric = name;
    row.innerHTML = `
      <span class="${PREFIX}-icon">${ICONS[name]}</span>
      <span class="${PREFIX}-name">${name}</span>
      <span class="${PREFIX}-value">—</span>
      <div class="${PREFIX}-bar-wrap"><div class="${PREFIX}-bar-fill" style="width: 100%"></div></div>
      <span class="${PREFIX}-rating">—</span>
    `;
    bars.appendChild(row);
  }
  wrap.appendChild(bars);

  const toggleBtn = header.querySelector(`.${PREFIX}-toggle`) as HTMLButtonElement;
  toggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    wrap.classList.toggle(`${PREFIX}-minimized`);
    toggleBtn.textContent = wrap.classList.contains(`${PREFIX}-minimized`) ? '+' : '−';
    toggleBtn.setAttribute('aria-label', wrap.classList.contains(`${PREFIX}-minimized`) ? 'Expand' : 'Minimize');
  });

  // Drag to move
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  const onMouseMove = (e: MouseEvent) => {
    const left = e.clientX - dragOffsetX;
    const top = e.clientY - dragOffsetY;
    wrap.style.left = `${left}px`;
    wrap.style.top = `${top}px`;
    wrap.style.right = 'auto';
  };
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest(`.${PREFIX}-toggle`)) return;
    const rect = wrap.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    wrap.style.left = `${rect.left}px`;
    wrap.style.top = `${rect.top}px`;
    wrap.style.right = 'auto';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  document.body.appendChild(wrap);
  return wrap;
}

function getBarFillPercent(name: string, value: number): number {
  switch (name) {
    case 'LCP':
      return fillPercent(value, LCP_THRESHOLDS, 6000);
    case 'INP':
      return fillPercent(value, INP_THRESHOLDS, 600);
    case 'CLS':
      return fillPercent(value, CLS_THRESHOLDS, 0.5);
    default:
      return 100;
  }
}

export function updateHUD(
  root: HTMLElement,
  newState: Partial<MetricsState>
): void {
  state = { ...state, ...newState };
  const bars = root.querySelector(`.${PREFIX}-bars`);
  if (!bars) return;

  const metricNames = ['LCP', 'INP', 'CLS'] as const;
  for (const name of metricNames) {
    const m = state[name];
    const row = bars.querySelector(`[data-metric="${name}"]`);
    if (!row || !m) continue;

    const prevRating = lastRating[name];
    const worsened = prevRating === 'good' && m.rating !== 'good'
      || prevRating === 'needs-improvement' && m.rating === 'poor';
    if (m.rating) lastRating[name] = m.rating;

    if (worsened) row.classList.add(`${PREFIX}-worsen`);
    row.classList.remove(`${PREFIX}-good`, `${PREFIX}-needs-improvement`, `${PREFIX}-poor`);
    row.classList.add(ratingClass(m.rating));

    const valueEl = row.querySelector(`.${PREFIX}-value`);
    const fillEl = row.querySelector(`.${PREFIX}-bar-fill`) as HTMLElement;
    const ratingEl = row.querySelector(`.${PREFIX}-rating`);
    if (valueEl) valueEl.textContent = m.label;
    if (fillEl) fillEl.style.width = `${getBarFillPercent(name, m.value)}%`;
    if (ratingEl) ratingEl.textContent = RATING_LABELS[m.rating];

    if (worsened) {
      setTimeout(() => row.classList.remove(`${PREFIX}-worsen`), 400);
    }
  }
}

export function destroyHUD(): void {
  document.getElementById(HUD_ID)?.remove();
  state = {};
  lastRating = {};
}
