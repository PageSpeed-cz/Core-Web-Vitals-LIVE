/**
 * pagespeed.One – INP visualizer: hatched bounding-box overlay on the interacted element for slow interactions (>50ms).
 * Falls back to a pointer-anchored badge when no element bounding rect is available.
 */

const PREFIX = 'cwv-live-inp';
const DURATION_THRESHOLD_MS = 50;
const DISMISS_MS = 1800;
const CLEANUP_DELAY_MS = 10_000;
const Z_INDEX = 2147483645;

const INP_GOOD_MS = 200;
const INP_POOR_MS = 500;

function inpColor(ms: number): string {
  if (ms <= INP_GOOD_MS) return '#0CCE6B';
  if (ms <= INP_POOR_MS) return '#FFA400';
  return '#FF4E42';
}

function makeLabelHTML(valueText: string, valueColor: string): string {
  return `INP: <span style="font-family:'Mona Sans',system-ui,sans-serif;font-weight:600;font-variant-numeric:tabular-nums;color:${valueColor}">${valueText}</span>`;
}

const HATCH = 'rgba(255, 0, 170, 0.5)';

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
    transparent 12px
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

let inpVizSeenInteractions: Set<number> | null = null;
let inpVizCleanupTimer: ReturnType<typeof setTimeout> | null = null;

function trackPointer(): void {
  const updatePointer = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length) {
      lastPointerX = e.touches[0].clientX;
      lastPointerY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    }
  };
  document.addEventListener('mousemove', updatePointer, { passive: true });
  document.addEventListener('touchmove', updatePointer, { passive: true });
  document.addEventListener('click', updatePointer, { passive: true });
}

function fadeAndRemove(el: HTMLElement): void {
  setTimeout(() => {
    el.classList.add(`${PREFIX}-fade`);
    setTimeout(() => el.remove(), 280);
  }, DISMISS_MS);
}

function showOverlay(duration: number, target: Element | null): void {
  ensureStyles();
  const color = inpColor(duration);
  const labelHTML = makeLabelHTML(`${Math.round(duration)}ms`, color);

  if (target) {
    try {
      const rect = target.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        const el = document.createElement('div');
        el.className = `${PREFIX}-overlay`;
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.top}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
        el.innerHTML = `<span class="${PREFIX}-label">${labelHTML}</span>`;
        document.body.appendChild(el);
        fadeAndRemove(el);
        return;
      }
    } catch {
      // fall through to pointer fallback
    }
  }

  // Fallback: floating badge anchored to last pointer position
  const badge = document.createElement('div');
  badge.className = `${PREFIX}-badge`;
  badge.style.left = `${lastPointerX}px`;
  badge.style.top = `${lastPointerY}px`;
  badge.innerHTML = `<span class="${PREFIX}-label">${labelHTML}</span>`;
  document.body.appendChild(badge);
  fadeAndRemove(badge);
}

export function initINPViz(): () => void {
  ensureStyles();
  trackPointer();

  inpVizSeenInteractions = new Set<number>();
  inpVizCleanupTimer = null;

  const observer = new PerformanceObserver((list) => {
    const bestPerInteraction = new Map<number, { duration: number; target: Element | null }>();
    const seen = inpVizSeenInteractions!;

    for (const entry of list.getEntries()) {
      const e = entry as EventTimingEntry;
      if (e.duration < DURATION_THRESHOLD_MS) continue;
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
    observer.observe({
      type: 'event',
      durationThreshold: DURATION_THRESHOLD_MS,
    });
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
