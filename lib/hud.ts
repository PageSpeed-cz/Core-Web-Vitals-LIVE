/**
 * pagespeed.One – HUD overlay with gaming-style metric squares.
 */

import type { MetricsState, MetricRating, OptionsState } from './types';
import { LCP_THRESHOLDS, INP_THRESHOLDS, CLS_THRESHOLDS } from './types';
import { PRIVACY_POLICY_PAGE_URL } from './privacy-policy-url';

const HUD_ID = 'cwv-live-hud';
const PREFIX = 'cwv-live';
const TOTAL_SQUARES = 10;
const LOGO_URL = 'https://pagespeed.one/en';
const TEST_INSIGHTS_URL = 'https://pagespeed.one/en/app/insights';
const EXTENSION_HOME_URL = 'https://github.com/PageSpeed-cz/Core-Web-Vitals-LIVE';

const EXTENSION_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="64 64 512 512" fill="none" aria-hidden="true"><path fill="currentColor" d="M64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM384 416C384 389.1 367.5 366.1 344 356.7L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184L296 356.7C272.5 366.2 256 389.2 256 416C256 451.3 284.7 480 320 480C355.3 480 384 451.3 384 416zM208 240C225.7 240 240 225.7 240 208C240 190.3 225.7 176 208 176C190.3 176 176 190.3 176 208C176 225.7 190.3 240 208 240zM192 320C192 302.3 177.7 288 160 288C142.3 288 128 302.3 128 320C128 337.7 142.3 352 160 352C177.7 352 192 337.7 192 320zM480 352C497.7 352 512 337.7 512 320C512 302.3 497.7 288 480 288C462.3 288 448 302.3 448 320C448 337.7 462.3 352 480 352zM464 208C464 190.3 449.7 176 432 176C414.3 176 400 190.3 400 208C400 225.7 414.3 240 432 240C449.7 240 464 225.7 464 208z"/></svg>`;
const PAGESPEED_MARK_SVG = `<svg viewBox="50 50 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M100 150C127.613 150 150 127.615 150 100C150 72.3849 127.613 50 100 50C72.387 50 50 72.3849 50 100C50 127.615 72.3849 150 100 150Z" fill="currentColor"/><path d="M90.9479 103.006L91.855 87.9079L117.152 89.3971L90.9479 103.006ZM129.954 92.1142C129.954 87.3428 128.408 83.5804 125.285 80.8591C122.16 78.1377 117.658 76.7611 111.744 76.7611H75.1232L70.9232 124.94H88.764L89.9069 111.468H108.689C115.24 111.468 120.447 109.721 124.246 106.261C128.042 102.8 129.958 98.0625 129.958 92.1163" fill="currentColor"/></svg>`;

// Heroicons (outline) — per spec from user
const ICON_POWER = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" /></svg>`;
const ICON_XMARK = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`;
const ICON_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" /></svg>`;

function fontCss(): string {
  const mona = browser.runtime.getURL('/fonts/mona-sans-latin-wght-normal.woff2' as any);
  const special = browser.runtime.getURL('/fonts/special-gothic-expanded-one-latin-400-normal.woff2' as any);
  return `
@font-face {
  font-family: "Mona Sans Variable";
  font-style: normal;
  font-display: swap;
  font-weight: 200 900;
  src: url("${mona}") format("woff2-variations");
}
@font-face {
  font-family: "Special Gothic Expanded One";
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url("${special}") format("woff2");
}
`;
}

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
${fontCss()}
.${HUD_ID} {
  position: fixed;
  z-index: 2147483646;
  font-family: "Mona Sans Variable", system-ui, -apple-system, sans-serif;
  font-weight: 500;
  font-size: 13px;
  line-height: 1.3;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  padding: 14px 18px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.86);
  backdrop-filter: blur(26px) saturate(1.35);
  -webkit-backdrop-filter: blur(26px) saturate(1.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 44px rgba(0,0,0,0.55);
  user-select: none;
  pointer-events: auto;
  color: rgba(255, 255, 255, 0.95);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

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

.${HUD_ID} .${PREFIX}-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.${HUD_ID} .${PREFIX}-logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  pointer-events: auto;
  cursor: pointer;
  color: #FF00AA;
}
.${HUD_ID} .${PREFIX}-logo svg {
  height: 18px;
  width: 18px;
}

.${HUD_ID} .${PREFIX}-title {
  font-family: "Special Gothic Expanded One", "Mona Sans Variable", system-ui, -apple-system,
    sans-serif;
  font-weight: 400;
  font-size: 14px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.95);
}

.${HUD_ID} .${PREFIX}-iconbtn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  border-radius: 10px;
  font-family: "Mona Sans Variable", system-ui, sans-serif;
  font-weight: 500;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
}
.${HUD_ID} .${PREFIX}-iconbtn:hover {
  color: rgba(255, 255, 255, 1);
  background: transparent;
}
.${HUD_ID} .${PREFIX}-iconbtn svg {
  display: block;
  width: 22px;
  height: 22px;
}

.${HUD_ID} .${PREFIX}-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.${HUD_ID} .${PREFIX}-icon-onoff { color: rgba(255, 255, 255, 0.85); }
.${HUD_ID}.${PREFIX}-state-off .${PREFIX}-icon-onoff { color: rgba(255, 255, 255, 0.45); }
.${HUD_ID} .${PREFIX}-icon-onoff.${PREFIX}-on { color: rgba(12, 206, 107, 0.95); }
.${HUD_ID} .${PREFIX}-icon-onoff.${PREFIX}-on {
  background: rgba(12, 206, 107, 0.14);
  border-color: rgba(12, 206, 107, 0.40);
}

.${HUD_ID}.${PREFIX}-state-off {
  /* Keep the HUD "black glass" even when inactive; only the on/off icon indicates state. */
  opacity: 1;
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
  font-family: "Special Gothic Expanded One", "Mona Sans Variable", system-ui, -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.9);
}

.${HUD_ID} .${PREFIX}-abbr {
  font-family: "Mona Sans Variable", system-ui, -apple-system, sans-serif;
  font-weight: 500;
  font-size: 11px;
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.5;
  margin-left: 3px;
}

.${HUD_ID} .${PREFIX}-value {
  font-size: 14px;
  font-weight: 600;
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

/* Options */
.${HUD_ID} .${PREFIX}-divider {
  margin: 12px 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.${HUD_ID} .${PREFIX}-options-panel {
  margin-top: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.${HUD_ID} .${PREFIX}-options-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.92);
  padding: 10px 12px;
  border-radius: 0;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
}
.${HUD_ID} .${PREFIX}-options-toggle:hover {
  background: rgba(255, 255, 255, 0.06);
}
.${HUD_ID} .${PREFIX}-chev {
  opacity: 0.8;
  transition: transform 0.2s ease;
}
.${HUD_ID}.${PREFIX}-options-open .${PREFIX}-chev {
  transform: rotate(180deg);
}
.${HUD_ID} .${PREFIX}-chev svg {
  display: block;
  width: 18px;
  height: 18px;
}
.${HUD_ID} .${PREFIX}-options {
  padding: 10px 12px 12px;
  display: none;
}
.${HUD_ID}.${PREFIX}-options-open .${PREFIX}-options {
  display: block;
}

.${HUD_ID} .${PREFIX}-opt-section {
  margin-top: 10px;
}
.${HUD_ID} .${PREFIX}-opt-section:first-child {
  margin-top: 0;
}
.${HUD_ID} .${PREFIX}-opt-title {
  margin: 0 0 8px;
  font-family: "Special Gothic Expanded One", "Mona Sans Variable", system-ui, -apple-system,
    sans-serif;
  font-weight: 400;
  font-size: 12px;
  letter-spacing: 0.04em;
  opacity: 0.9;
  text-transform: uppercase;
}
.${HUD_ID} .${PREFIX}-opt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.10);
}
.${HUD_ID} .${PREFIX}-opt-row + .${PREFIX}-opt-row { margin-top: 6px; }
.${HUD_ID} .${PREFIX}-opt-label {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.${HUD_ID} .${PREFIX}-opt-label strong { font-size: 13px; }
.${HUD_ID} .${PREFIX}-opt-desc {
  font-size: 12px;
  opacity: 0.75;
  font-weight: 500;
}
/* Glow switch */
.${HUD_ID} .${PREFIX}-switch {
  flex-shrink: 0;
  position: relative;
  width: 42px;
  height: 26px;
}
.${HUD_ID} .${PREFIX}-switch input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}
.${HUD_ID} .${PREFIX}-switch .${PREFIX}-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.14);
  transition: background 0.18s ease, border-color 0.18s ease;
}
.${HUD_ID} .${PREFIX}-switch .${PREFIX}-thumb {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
  transition: left 0.18s ease, background 0.18s ease;
}
.${HUD_ID} .${PREFIX}-switch input:checked + .${PREFIX}-track {
  background: rgba(12, 206, 107, 0.85);
  border-color: rgba(12, 206, 107, 0.85);
}
.${HUD_ID} .${PREFIX}-switch input:checked + .${PREFIX}-track .${PREFIX}-thumb {
  left: 19px;
  background: rgba(255,255,255,0.95);
}
.${HUD_ID} .${PREFIX}-switch input:focus-visible + .${PREFIX}-track {
  outline: 2px solid rgba(255,255,255,0.65);
  outline-offset: 2px;
}

.${HUD_ID} .${PREFIX}-footer {
  margin-top: 12px;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 10px;
  justify-content: center;
  white-space: nowrap;
}
.${HUD_ID} .${PREFIX}-footer a {
  color: rgba(255,255,255,0.78);
  text-decoration: none;
  font-weight: 600;
  font-size: 12px;
}
.${HUD_ID} .${PREFIX}-footer a:hover {
  color: rgba(255,255,255,0.95);
  text-decoration: underline;
}
.${HUD_ID} .${PREFIX}-footer .${PREFIX}-sep {
  opacity: 0.35;
}
.${HUD_ID} .${PREFIX}-footer a.${PREFIX}-primary {
  color: rgba(255, 255, 255, 0.95);
}

.${HUD_ID} .${PREFIX}-footer a.${PREFIX}-primary .${PREFIX}-psmark {
  color: #FF00AA;
}

.${HUD_ID} .${PREFIX}-psmark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.${HUD_ID} .${PREFIX}-psmark svg {
  width: 14px;
  height: 14px;
  display: block;
}
`;

let state: Partial<MetricsState> = {};
let lastRating: Partial<Record<string, MetricRating>> = {};

const HUD_DEFAULT_STYLE = 'top: 16px; right: 16px;';

export type HudCallbacks = {
  onToggleActive: (nextActive: boolean) => void;
  onClose: () => void;
  onSetOptionsExpanded: (expanded: boolean) => void;
  onSetOption: (partial: Partial<OptionsState>) => void;
  onToggleThrottling: (enabled: boolean) => void;
  onSetPosition: (pos: { top: number; left: number }) => void;
};

type HudUIState = {
  active: boolean;
  throttled: boolean;
  options: OptionsState;
};

let callbacks: HudCallbacks | null = null;
let uiState: HudUIState | null = null;

function setHeaderState(root: HTMLElement) {
  if (!uiState) return;
  root.classList.toggle(`${PREFIX}-state-off`, !uiState.active);

  const throttleInput = root.querySelector(`#${PREFIX}-throttle`) as HTMLInputElement | null;
  if (throttleInput) throttleInput.checked = uiState.throttled;

  const clsInput = root.querySelector(`#${PREFIX}-cls`) as HTMLInputElement | null;
  const inpInput = root.querySelector(`#${PREFIX}-inp`) as HTMLInputElement | null;
  const lcpInput = root.querySelector(`#${PREFIX}-lcp`) as HTMLInputElement | null;
  if (clsInput) clsInput.checked = uiState.options.clsVizEnabled;
  if (inpInput) inpInput.checked = uiState.options.inpVizEnabled;
  if (lcpInput) lcpInput.checked = uiState.options.lcpVizEnabled;

  root.classList.toggle(`${PREFIX}-options-open`, uiState.options.hudOptionsExpanded);
}

export function createHUD(next: { callbacks: HudCallbacks; ui: HudUIState }): HTMLElement {
  const existing = document.getElementById(HUD_ID);
  if (existing) return existing;

  callbacks = next.callbacks;
  uiState = next.ui;

  const wrap = document.createElement('div');
  wrap.id = HUD_ID;
  wrap.className = HUD_ID;
  if (next.ui.options.hudPosition) {
    const { top, left } = next.ui.options.hudPosition;
    wrap.style.top = `${top}px`;
    wrap.style.left = `${left}px`;
    wrap.style.right = 'auto';
  } else {
    wrap.setAttribute('style', HUD_DEFAULT_STYLE);
  }

  const style = document.createElement('style');
  style.textContent = STYLES;
  wrap.appendChild(style);

  const header = document.createElement('div');
  header.className = `${PREFIX}-header`;
  header.innerHTML = `
    <div class="${PREFIX}-header-left">
      <span class="${PREFIX}-logo" aria-hidden="true">${EXTENSION_MARK_SVG}</span>
      <span class="${PREFIX}-title">Core Web Vitals Live</span>
    </div>
    <div class="${PREFIX}-header-right">
      <button type="button" class="${PREFIX}-iconbtn" data-${PREFIX}-close aria-label="Close">${ICON_XMARK}</button>
    </div>
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
      <span class="${PREFIX}-name">${METRIC_NAMES[name]} <span class="${PREFIX}-abbr">(${name})</span></span>
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

  const closeBtn = header.querySelector(`[data-${PREFIX}-close]`) as HTMLButtonElement | null;
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks?.onClose();
  });

  const divider1 = document.createElement('div');
  divider1.className = `${PREFIX}-divider`;
  wrap.appendChild(divider1);

  const optionsPanel = document.createElement('div');
  optionsPanel.className = `${PREFIX}-options-panel`;

  const optionsToggle = document.createElement('button');
  optionsToggle.type = 'button';
  optionsToggle.className = `${PREFIX}-options-toggle`;
  optionsToggle.innerHTML = `Show options <span class="${PREFIX}-chev">${ICON_CHEVRON}</span>`;
  optionsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!callbacks || !uiState) return;
    const nextExpanded = !uiState.options.hudOptionsExpanded;
    callbacks.onSetOptionsExpanded(nextExpanded);
  });
  optionsPanel.appendChild(optionsToggle);

  const options = document.createElement('div');
  options.className = `${PREFIX}-options`;
  options.innerHTML = `
    <div class="${PREFIX}-opt-section">
      <label class="${PREFIX}-opt-row">
        <div class="${PREFIX}-opt-label">
          <strong>Emulate slower device</strong>
          <div class="${PREFIX}-opt-desc">4\u00d7 CPU slowdown + Fast 4G network. A yellow browser bar will appear \u2014 this is normal and required for throttling.</div>
        </div>
        <div class="${PREFIX}-switch">
          <input id="${PREFIX}-throttle" type="checkbox" />
          <span class="${PREFIX}-track"><span class="${PREFIX}-thumb"></span></span>
        </div>
      </label>
    </div>

    <div class="${PREFIX}-opt-section">
      <label class="${PREFIX}-opt-row">
        <div class="${PREFIX}-opt-label"><strong>Visualize CLS</strong></div>
        <div class="${PREFIX}-switch">
          <input id="${PREFIX}-cls" type="checkbox" />
          <span class="${PREFIX}-track"><span class="${PREFIX}-thumb"></span></span>
        </div>
      </label>
      <label class="${PREFIX}-opt-row">
        <div class="${PREFIX}-opt-label"><strong>Visualize INP</strong></div>
        <div class="${PREFIX}-switch">
          <input id="${PREFIX}-inp" type="checkbox" />
          <span class="${PREFIX}-track"><span class="${PREFIX}-thumb"></span></span>
        </div>
      </label>
      <label class="${PREFIX}-opt-row">
        <div class="${PREFIX}-opt-label"><strong>Visualize LCP</strong></div>
        <div class="${PREFIX}-switch">
          <input id="${PREFIX}-lcp" type="checkbox" />
          <span class="${PREFIX}-track"><span class="${PREFIX}-thumb"></span></span>
        </div>
      </label>
    </div>

  `;
  optionsPanel.appendChild(options);
  wrap.appendChild(optionsPanel);

  const footer = document.createElement('div');
  footer.className = `${PREFIX}-footer`;
  footer.innerHTML = `
    <a class="${PREFIX}-primary" href="${TEST_INSIGHTS_URL}" target="_blank" rel="noopener"><span class="${PREFIX}-psmark" aria-hidden="true">${PAGESPEED_MARK_SVG}</span>&nbsp;Test your site speed</a>
    <span class="${PREFIX}-sep">\u2014</span>
    <a href="${EXTENSION_HOME_URL}" target="_blank" rel="noopener">Home</a>
    <span class="${PREFIX}-sep">\u2014</span>
    <a href="${PRIVACY_POLICY_PAGE_URL}" target="_blank" rel="noopener">Privacy</a>
  `;
  wrap.appendChild(footer);

  const throttleEl = options.querySelector(`#${PREFIX}-throttle`) as HTMLInputElement | null;
  throttleEl?.addEventListener('change', () => {
    if (!callbacks) return;
    callbacks.onToggleThrottling(!!throttleEl.checked);
    callbacks.onSetOption({ throttlingEnabled: !!throttleEl.checked });
  });

  function onVizChange() {
    if (!callbacks) return;
    const cls = (options.querySelector(`#${PREFIX}-cls`) as HTMLInputElement | null)?.checked ?? true;
    const inp = (options.querySelector(`#${PREFIX}-inp`) as HTMLInputElement | null)?.checked ?? true;
    const lcp = (options.querySelector(`#${PREFIX}-lcp`) as HTMLInputElement | null)?.checked ?? true;
    callbacks.onSetOption({ clsVizEnabled: cls, inpVizEnabled: inp, lcpVizEnabled: lcp });
  }
  (options.querySelector(`#${PREFIX}-cls`) as HTMLInputElement | null)?.addEventListener('change', onVizChange);
  (options.querySelector(`#${PREFIX}-inp`) as HTMLInputElement | null)?.addEventListener('change', onVizChange);
  (options.querySelector(`#${PREFIX}-lcp`) as HTMLInputElement | null)?.addEventListener('change', onVizChange);

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
    if (!callbacks) return;
    const rect = wrap.getBoundingClientRect();
    callbacks.onSetPosition({ top: Math.max(0, rect.top), left: Math.max(0, rect.left) });
  };
  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest(`[data-${PREFIX}-onoff], [data-${PREFIX}-close], .${PREFIX}-logo`))
      return;
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
  setHeaderState(wrap);
  return wrap;
}

export function updateHUD(
  root: HTMLElement,
  newState: Partial<MetricsState>,
  next?: Partial<HudUIState>
): void {
  state = { ...state, ...newState };
  if (next && uiState) {
    uiState = { ...uiState, ...next, options: { ...uiState.options, ...(next.options ?? {}) } };
  } else if (next && !uiState) {
    // first update after create (shouldn't happen, but keep safe)
    uiState = next as HudUIState;
  }
  setHeaderState(root);

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
  callbacks = null;
  uiState = null;
}
