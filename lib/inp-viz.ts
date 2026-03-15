/**
 * pagespeed.One – INP visualizer: hatched bounding-box overlay on the interacted element.
 * Shows for all interactions (≥16ms API minimum).
 * Fallback chain: PerformanceEventTiming.target → lastKeyTarget (active element on keydown) → pointer badge.
 */

const PREFIX = 'cwv-live-inp';
const DISMISS_MS = 1800;
const CLEANUP_DELAY_MS = 10_000;
// CSS max z-index – stays above modal dialogs and other high-z-index overlays
const Z_INDEX = 2147483647;

const INP_GOOD_MS = 200;
const INP_POOR_MS = 500;

function inpColor(ms: number): string {
  if (ms <= INP_GOOD_MS) return '#0CCE6B';
  if (ms <= INP_POOR_MS) return '#FFA400';
  return '#FF4E42';
}

function makeLabelHTML(valueText: string, valueColor: string): string {
  return `INP: <span style="font-family:'Mona Sans',system-ui,sans-serif;font-weight:600;font-variant-numeric:tabular-nums;text-transform:none;color:${valueColor}">${valueText}</span>`;
}

// 25% opacity, 3px stripe / 6px period → 50% area coverage
const HATCH = 'rgba(255, 0, 170, 0.25)';

const STYLES = `
.${PREFIX}-overlay {
  position: fixed;
  pointer-events: none;
  z-index: ${Z_INDEX};
  border: 3px solid rgba(255, 0, 170, 0.8);
  border-radius: 4px;
  box-sizing: border-box;
  background-image: repeating-linear-gradient(
    45deg,
    ${HATCH} 0px,
    ${HATCH} 3px,
    transparent 3px,
    transparent 6px
  );
  transition: opacity 0.25s ease;
}
.${PREFIX}-overlay.${PREFIX}-fade {
  opacity: 0;
}
.${PREFIX}-badge {
  position: fixed;
  pointer-events: none;
  z-index: ${Z_INDEX};
  transform: translate(-50%, calc(-100% - 8px));
}
.${PREFIX}-badge.${PREFIX}-fade {
  opacity: 0;
  transition: opacity 0.25s ease;
}
.${PREFIX}-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  font-family: 'Special Gothic Expanded One', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(16, 16, 36, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 20px;
  border-radius: 4px;
  white-space: nowrap;
}
.${PREFIX}-badge .${PREFIX}-label {
  position: static;
  transform: none;
  display: block;
}
`;

let styleEl: HTMLStyleElement | null = null;

function ensureStyles(): void {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

interface EventTimingEntry extends PerformanceEntry {
  duration: number;
  target: Node | null;
  interactionId?: number;
}

let lastPointerX = 0;
let lastPointerY = 0;
let lastKeyTarget: Element | null = null;

let inpVizSeenInteractions: Set<number> | null = null;
let inpVizCleanupTimer: ReturnType<typeof setTimeout> | null = null;

function trackPointer(): void {
  const update = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length) {
      lastPointerX = e.touches[0].clientX;
      lastPointerY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    }
  };
  document.addEventListener('mousemove', update, { passive: true });
  document.addEventListener('touchmove', update, { passive: true });
  document.addEventListener('click', update, { passive: true });
}

function trackKeyboard(): void {
  document.addEventListener('keydown', () => {
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) {
      lastKeyTarget = active;
    }
  }, { passive: true, capture: true });
}

function fadeAndRemove(el: HTMLElement): void {
  setTimeout(() => {
    el.classList.add(`${PREFIX}-fade`);
    setTimeout(() => el.remove(), 280);
  }, DISMISS_MS);
}

function isInsideHUD(el: Element): boolean {
  return !!el.closest('#cwv-live-hud');
}

function tryShowBox(labelHTML: string, element: Element): boolean {
  try {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      const el = document.createElement('div');
      el.className = `${PREFIX}-overlay`;
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.innerHTML = `<span class="${PREFIX}-label">${labelHTML}</span>`;
      // Append to documentElement to escape body stacking context and stay above modals
      document.documentElement.appendChild(el);
      fadeAndRemove(el);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function showOverlay(duration: number, target: Element | null): void {
  // Skip interactions on the extension's own HUD
  if (target && isInsideHUD(target)) return;

  ensureStyles();
  const color = inpColor(duration);
  const labelHTML = makeLabelHTML(`${Math.round(duration)}ms`, color);

  // 1st: element reported by PerformanceEventTiming
  if (target && tryShowBox(labelHTML, target)) return;

  // 2nd: last focused element captured at keydown time (for keyboard interactions
  //      where PerformanceEventTiming.target may be null or already detached)
  if (lastKeyTarget && lastKeyTarget.isConnected && !isInsideHUD(lastKeyTarget) && tryShowBox(labelHTML, lastKeyTarget)) return;

  // 3rd: pointer-anchored badge fallback
  const badge = document.createElement('div');
  badge.className = `${PREFIX}-badge`;
  badge.style.left = `${lastPointerX}px`;
  badge.style.top = `${lastPointerY}px`;
  badge.innerHTML = `<span class="${PREFIX}-label">${labelHTML}</span>`;
  document.documentElement.appendChild(badge);
  fadeAndRemove(badge);
}

export function initINPViz(): () => void {
  ensureStyles();
  trackPointer();
  trackKeyboard();

  inpVizSeenInteractions = new Set<number>();
  inpVizCleanupTimer = null;

  const observer = new PerformanceObserver((list) => {
    const bestPerInteraction = new Map<number, { duration: number; target: Element | null }>();
    const seen = inpVizSeenInteractions!;

    for (const entry of list.getEntries()) {
      const e = entry as EventTimingEntry;
      if (!e.interactionId) continue;
      if (seen.has(e.interactionId)) continue;

      const target = e.target instanceof Element ? e.target : null;

      const existing = bestPerInteraction.get(e.interactionId);
      if (!existing || e.duration > existing.duration) {
        bestPerInteraction.set(e.interactionId, { duration: e.duration, target });
      }
    }

    for (const [id, { duration, target }] of bestPerInteraction) {
      seen.add(id);
      showOverlay(duration, target);
    }

    if (!inpVizCleanupTimer) {
      inpVizCleanupTimer = setTimeout(() => {
        inpVizSeenInteractions?.clear();
        inpVizCleanupTimer = null;
      }, CLEANUP_DELAY_MS);
    }
  });

  try {
    // 16ms is the API minimum – shows all measurable interactions
    observer.observe({ type: 'event', durationThreshold: 16 });
  } catch {
    observer.observe({ type: 'event' });
  }

  return () => {
    if (inpVizCleanupTimer) clearTimeout(inpVizCleanupTimer);
    inpVizCleanupTimer = null;
    inpVizSeenInteractions?.clear();
    observer.disconnect();
  };
}

export function destroyINPViz(): void {
  if (inpVizCleanupTimer) clearTimeout(inpVizCleanupTimer);
  inpVizCleanupTimer = null;
  inpVizSeenInteractions?.clear();
  document.querySelectorAll(`.${PREFIX}-overlay, .${PREFIX}-badge`).forEach((el) => el.remove());
  styleEl?.remove();
  styleEl = null;
}
