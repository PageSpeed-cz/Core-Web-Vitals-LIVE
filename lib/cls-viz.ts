/**
 * pagespeed.One – CLS visualizer: branded overlays on layout-shifted areas.
 */

const PREFIX = 'cwv-live-cls';
const FADE_MS = 4000;
const Z_INDEX = 2147483645;
const MIN_SHIFT_VALUE = 0.005;

const CLS_GOOD = 0.1;
const CLS_POOR = 0.25;

function clsColor(value: number): string {
  if (value <= CLS_GOOD) return '#0CCE6B';
  if (value <= CLS_POOR) return '#FFA400';
  return '#FF4E42';
}

function makeLabelHTML(prefix: string, valueText: string, valueColor: string): string {
  return `${prefix}: <span style="font-weight:600;font-variant-numeric:tabular-nums;text-transform:none;color:${valueColor}">${valueText}</span>`;
}

const MONA_FONT_URL = browser.runtime.getURL('/fonts/mona-sans-latin-wght-normal.woff2' as any);
const SPECIAL_FONT_URL = browser.runtime.getURL(
  '/fonts/special-gothic-expanded-one-latin-400-normal.woff2' as any
);

const STYLES = `
@font-face {
  font-family: "Mona Sans Variable";
  font-style: normal;
  font-display: swap;
  font-weight: 200 900;
  src: url("${MONA_FONT_URL}") format("woff2-variations");
}
@font-face {
  font-family: "Special Gothic Expanded One";
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url("${SPECIAL_FONT_URL}") format("woff2");
}

.${PREFIX}-overlay {
  position: fixed;
  pointer-events: none;
  z-index: ${Z_INDEX};
  background: rgba(255, 0, 170, 0.25);
  border: 2px solid rgba(255, 0, 170, 0.55);
  border-radius: 4px;
  box-sizing: border-box;
  transition: opacity ${FADE_MS}ms ease-out;
}
.${PREFIX}-overlay.${PREFIX}-fade {
  opacity: 0;
}
.${PREFIX}-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  font-family: "Mona Sans Variable", system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(16, 16, 36, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 4px;
  white-space: nowrap;
}
`;

let styleEl: HTMLStyleElement | null = null;

function ensureStyles(): void {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources?: Array<{
    node?: Node | null;
    previousRect: DOMRectReadOnly;
    currentRect: DOMRectReadOnly;
  }>;
}

let observer: PerformanceObserver | null = null;

export function initCLSViz(): () => void {
  ensureStyles();
  observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const le = entry as LayoutShiftEntry;
      if (le.hadRecentInput) continue;
      if (le.value < MIN_SHIFT_VALUE) continue;
      showCLSOverlay(le);
    }
  });
  observer.observe({ type: 'layout-shift', buffered: true });
  return () => {
    observer?.disconnect();
    observer = null;
  };
}

function showCLSOverlay(entry: LayoutShiftEntry): void {
  const value = entry.value;
  const color = clsColor(value);
  const labelInner = makeLabelHTML('CLS', `+${value.toFixed(2)}`, color);
  const sources = entry.sources ?? [];

  if (sources.length === 0) return;

  for (const source of sources) {
    const rect = source.currentRect;
    if (rect.width === 0 || rect.height === 0) continue;
    if (isLikelyExtensionInducedSource(source)) continue;

    const el = document.createElement('div');
    el.className = `${PREFIX}-overlay`;
    // Use transform positioning to avoid contributing additional layout shifts.
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    el.innerHTML = `<span class="${PREFIX}-label">${labelInner}</span>`;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add(`${PREFIX}-fade`);
    });
    setTimeout(() => el.remove(), FADE_MS + 100);
  }
}

function rectArea(r: DOMRectReadOnly): number {
  return Math.max(0, r.width) * Math.max(0, r.height);
}

function intersectArea(a: DOMRectReadOnly, b: DOMRectReadOnly): number {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  const w = Math.max(0, right - left);
  const h = Math.max(0, bottom - top);
  return w * h;
}

function extensionHudRects(): DOMRect[] {
  const ids = ['cwv-live-hud-wrap', 'cwv-live-hud-frame', 'cwv-live-hud-ghost', 'cwv-live-hud'];
  const rects: DOMRect[] = [];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    rects.push(el.getBoundingClientRect());
  }
  return rects;
}

function isLikelyExtensionInducedSource(source: {
  node?: Node | null;
  previousRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}): boolean {
  const node = source.node;
  if (node && node instanceof Element) {
    if (
      node.closest('#cwv-live-hud-wrap') ||
      node.closest('#cwv-live-hud-frame') ||
      node.closest('#cwv-live-hud-ghost') ||
      node.closest('#cwv-live-hud')
    ) {
      return true;
    }
  }

  const r = source.currentRect;
  const area = rectArea(r);
  if (area <= 0) return false;

  for (const hr of extensionHudRects()) {
    const ia = intersectArea(r, hr);
    // If the shifted region largely coincides with our HUD footprint, treat it as extension noise.
    if (ia / area > 0.35) return true;
  }

  return false;
}

export function destroyCLSViz(): void {
  document.querySelectorAll(`.${PREFIX}-overlay`).forEach((el) => el.remove());
  styleEl?.remove();
  styleEl = null;
}
