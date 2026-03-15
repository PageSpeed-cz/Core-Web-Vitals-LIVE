/**
 * Core Web Vitals Live – CLS visualizer: purple overlays on layout-shifted areas.
 */

const PREFIX = 'cwv-live-cls';
const FADE_MS = 2000;
const Z_INDEX = 2147483645;

const STYLES = `
.${PREFIX}-overlay {
  position: fixed;
  pointer-events: none;
  z-index: ${Z_INDEX};
  background: rgba(138, 43, 226, 0.35);
  border: 2px solid rgba(138, 43, 226, 0.6);
  border-radius: 4px;
  box-sizing: border-box;
  transition: opacity ${FADE_MS}ms ease-out;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 4px 6px;
}
.${PREFIX}-overlay.${PREFIX}-fade {
  opacity: 0;
}
.${PREFIX}-label {
  font-family: system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
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
  const label = `CLS +${value.toFixed(2)}`;
  const sources = entry.sources ?? [];

  if (sources.length === 0) return;

  for (const source of sources) {
    const rect = source.currentRect;
    if (rect.width === 0 || rect.height === 0) continue;

    const el = document.createElement('div');
    el.className = `${PREFIX}-overlay`;
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.innerHTML = `<span class="${PREFIX}-label">${label}</span>`;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add(`${PREFIX}-fade`);
    });
    setTimeout(() => el.remove(), FADE_MS + 100);
  }
}

export function destroyCLSViz(): void {
  document.querySelectorAll(`.${PREFIX}-overlay`).forEach((el) => el.remove());
  styleEl?.remove();
  styleEl = null;
}
