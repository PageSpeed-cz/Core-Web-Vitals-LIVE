/**
 * pagespeed.One – HUD overlay with gaming-style metric squares.
 */

import type { MetricsState, MetricRating } from './types';
import { LCP_THRESHOLDS, INP_THRESHOLDS, CLS_THRESHOLDS } from './types';

const HUD_ID = 'cwv-live-hud';
const PREFIX = 'cwv-live';
const FONT_ID = 'cwv-live-font';
const TOTAL_SQUARES = 10;
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Special+Gothic+Expanded+One&display=swap';

const METRIC_NAMES: Record<string, string> = {
  LCP: 'Loading',
  INP: 'Interactivity',
  CLS: 'Stability',
};

const METRIC_MAX: Record<string, number> = {
  LCP: 6000,
  INP: 600,
  CLS: 0.5,
};

const METRIC_THRESHOLDS: Record<string, [number, number]> = {
  LCP: LCP_THRESHOLDS,
  INP: INP_THRESHOLDS,
  CLS: CLS_THRESHOLDS,
};

const COLORS: Record<MetricRating, string> = {
  good: '#0CCE6B',
  'needs-improvement': '#FFA400',
  poor: '#FF4E42',
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function squareColor(
  index: number,
  thresholds: [number, number],
  maxValue: number
): string {
  const midpoint = ((index + 0.5) / TOTAL_SQUARES) * maxValue;
  if (midpoint <= thresholds[0]) return COLORS.good;
  if (midpoint <= thresholds[1]) return COLORS['needs-improvement'];
  return COLORS.poor;
}

function filledCount(value: number, maxValue: number): number {
  return Math.min(
    TOTAL_SQUARES,
    Math.max(0, Math.round((value / maxValue) * TOTAL_SQUARES))
  );
}

function ratingClass(rating: MetricRating): string {
  return `${PREFIX}-${rating}`;
}

const STYLES = `
.${HUD_ID} {
  position: fixed;
  z-index: 2147483646;
  font-family: 'Special Gothic Expanded One', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  line-height: 1.3;
  min-width: 260px;
  max-width: 340px;
  padding: 14px 18px;
  border-radius: 16px;
  background: rgba(16, 16, 36, 0.78);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  user-select: none;
  pointer-events: auto;
  color: rgba(255, 255, 255, 0.95);
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.${HUD_ID}.${PREFIX}-minimized {
  opacity: 0.5;
  transform: scale(0.9);
}
.${HUD_ID}.${PREFIX}-minimized .${PREFIX}-bars { display: none; }

.${HUD_ID} .${PREFIX}-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: grab;
}
.${HUD_ID} .${PREFIX}-header:active { cursor: grabbing; }

.${HUD_ID} .${PREFIX}-title {
  font-size: 11px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.5);
}

.${HUD_ID} .${PREFIX}-toggle {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 2px 6px;
  font-size: 16px;
  line-height: 1;
  border-radius: 4px;
  font-family: system-ui, sans-serif;
}
.${HUD_ID} .${PREFIX}-toggle:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
}

.${HUD_ID} .${PREFIX}-row {
  margin-bottom: 10px;
}
.${HUD_ID} .${PREFIX}-row:last-child { margin-bottom: 0; }

.${HUD_ID} .${PREFIX}-row-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 5px;
}

.${HUD_ID} .${PREFIX}-name {
  font-size: 14px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.9);
}

.${HUD_ID} .${PREFIX}-value {
  font-size: 14px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.${HUD_ID} .${PREFIX}-squares {
  display: flex;
  gap: 3px;
}

.${HUD_ID} .${PREFIX}-sq {
  flex: 1;
  height: 8px;
  border-radius: 2px;
  border: 1.5px solid transparent;
  box-sizing: border-box;
  transition: background 0.25s ease, border-color 0.25s ease;
}

.${HUD_ID} .${PREFIX}-row.${PREFIX}-worsen .${PREFIX}-squares {
  animation: ${PREFIX}-shake 0.4s ease;
}
@keyframes ${PREFIX}-shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

@media (max-width: 480px) {
  .${HUD_ID} {
    font-size: 12px;
    min-width: 220px;
    max-width: 280px;
    padding: 10px 14px;
  }
  .${HUD_ID} .${PREFIX}-name { font-size: 12px; }
  .${HUD_ID} .${PREFIX}-value { font-size: 12px; }
  .${HUD_ID} .${PREFIX}-sq { height: 6px; }
}
`;

let state: Partial<MetricsState> = {};
let lastRating: Partial<Record<string, MetricRating>> = {};

const HUD_DEFAULT_STYLE = 'top: 16px; right: 16px;';

function ensureFont(): void {
  if (document.getElementById(FONT_ID)) return;
  const link = document.createElement('link');
  link.id = FONT_ID;
  link.rel = 'stylesheet';
  link.href = FONT_URL;
  document.head.appendChild(link);
}

export function createHUD(): HTMLElement {
  const existing = document.getElementById(HUD_ID);
  if (existing) return existing;

  ensureFont();

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
    <span class="${PREFIX}-title">Core Web Vitals Live</span>
    <button type="button" class="${PREFIX}-toggle" aria-label="Minimize">\u2212</button>
  `;
  wrap.appendChild(header);

  const bars = document.createElement('div');
  bars.className = `${PREFIX}-bars`;
  const metricNames: ('LCP' | 'INP' | 'CLS')[] = ['LCP', 'INP', 'CLS'];

  for (const name of metricNames) {
    const row = document.createElement('div');
    row.className = `${PREFIX}-row`;
    row.dataset.metric = name;

    const rowHeader = document.createElement('div');
    rowHeader.className = `${PREFIX}-row-header`;
    rowHeader.innerHTML = `
      <span class="${PREFIX}-name">${METRIC_NAMES[name]}</span>
      <span class="${PREFIX}-value">\u2014</span>
    `;
    row.appendChild(rowHeader);

    const squaresDiv = document.createElement('div');
    squaresDiv.className = `${PREFIX}-squares`;
    const thresholds = METRIC_THRESHOLDS[name];
    const maxValue = METRIC_MAX[name];

    for (let i = 0; i < TOTAL_SQUARES; i++) {
      const sq = document.createElement('span');
      sq.className = `${PREFIX}-sq`;
      const color = squareColor(i, thresholds, maxValue);
      sq.style.background = hexToRgba(color, 0.12);
      sq.style.borderColor = hexToRgba(color, 0.2);
      squaresDiv.appendChild(sq);
    }
    row.appendChild(squaresDiv);
    bars.appendChild(row);
  }
  wrap.appendChild(bars);

  const toggleBtn = header.querySelector(
    `.${PREFIX}-toggle`
  ) as HTMLButtonElement;
  toggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    wrap.classList.toggle(`${PREFIX}-minimized`);
    toggleBtn.textContent = wrap.classList.contains(`${PREFIX}-minimized`)
      ? '+'
      : '\u2212';
    toggleBtn.setAttribute(
      'aria-label',
      wrap.classList.contains(`${PREFIX}-minimized`) ? 'Expand' : 'Minimize'
    );
  });

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
    const worsened =
      (prevRating === 'good' && m.rating !== 'good') ||
      (prevRating === 'needs-improvement' && m.rating === 'poor');
    if (m.rating) lastRating[name] = m.rating;

    if (worsened) row.classList.add(`${PREFIX}-worsen`);
    row.classList.remove(
      `${PREFIX}-good`,
      `${PREFIX}-needs-improvement`,
      `${PREFIX}-poor`
    );
    row.classList.add(ratingClass(m.rating));

    const valueEl = row.querySelector(`.${PREFIX}-value`) as HTMLElement;
    if (valueEl) {
      valueEl.textContent = m.label;
      valueEl.style.color = COLORS[m.rating];
    }

    const thresholds = METRIC_THRESHOLDS[name];
    const maxValue = METRIC_MAX[name];
    const filled = filledCount(m.value, maxValue);
    const squares = row.querySelectorAll(`.${PREFIX}-sq`);

    for (let i = 0; i < squares.length; i++) {
      const sq = squares[i] as HTMLElement;
      const color = squareColor(i, thresholds, maxValue);
      if (i < filled) {
        sq.style.background = color;
        sq.style.borderColor = color;
      } else {
        sq.style.background = hexToRgba(color, 0.12);
        sq.style.borderColor = hexToRgba(color, 0.2);
      }
    }

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
