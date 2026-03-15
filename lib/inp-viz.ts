/**
 * Core Web Vitals Live – INP visualizer: cursor/target badge for slow interactions (>50ms).
 */

const PREFIX = 'cwv-live-inp';
const DURATION_THRESHOLD_MS = 50;
const DISMISS_MS = 1800;
const Z_INDEX = 2147483645;

const STYLES = `
.${PREFIX}-badge {
  position: fixed;
  pointer-events: none;
  z-index: ${Z_INDEX};
  padding: 4px 8px;
  border-radius: 6px;
  font-family: system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
  white-space: nowrap;
  box-sizing: border-box;
  animation: ${PREFIX}-pop 0.2s ease;
  transform: translate(-50%, -100%);
  margin-top: -8px;
}
.${PREFIX}-badge.${PREFIX}-amber {
  background: #E6A800;
  border: 1px solid rgba(0,0,0,0.2);
}
.${PREFIX}-badge.${PREFIX}-red {
  background: #D93025;
  border: 1px solid rgba(0,0,0,0.2);
  animation: ${PREFIX}-pop 0.2s ease, ${PREFIX}-pulse 0.6s ease 0.2s 2;
}
@keyframes ${PREFIX}-pop {
  from { opacity: 0; transform: translate(-50%, -100%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
}
@keyframes ${PREFIX}-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(217, 48, 37, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(217, 48, 37, 0); }
}
.${PREFIX}-badge.${PREFIX}-fade {
  opacity: 0;
  transition: opacity 0.25s ease;
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
}

let lastPointerX = 0;
let lastPointerY = 0;

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

function showBadge(duration: number, x: number, y: number): void {
  ensureStyles();
  const isPoor = duration > 200;
  const el = document.createElement('div');
  el.className = `${PREFIX}-badge ${isPoor ? `${PREFIX}-red` : `${PREFIX}-amber`}`;
  el.textContent = `⚡ ${Math.round(duration)}ms`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);

  setTimeout(() => {
    el.classList.add(`${PREFIX}-fade`);
    setTimeout(() => el.remove(), 280);
  }, DISMISS_MS);
}

export function initINPViz(): () => void {
  ensureStyles();
  trackPointer();

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const e = entry as EventTimingEntry;
      if (e.duration < DURATION_THRESHOLD_MS) continue;

      let x = lastPointerX;
      let y = lastPointerY;
      if (e.target && e.target instanceof Element) {
        try {
          const rect = e.target.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top;
        } catch {
          // use last pointer if getBoundingClientRect fails
        }
      }
      showBadge(e.duration, x, y);
    }
  });

  try {
    observer.observe({
      type: 'event',
      durationThreshold: DURATION_THRESHOLD_MS,
      buffered: true,
    });
  } catch {
    // some browsers may not support durationThreshold
    observer.observe({ type: 'event', buffered: true });
  }

  return () => observer.disconnect();
}

export function destroyINPViz(): void {
  document.querySelectorAll(`.${PREFIX}-badge`).forEach((el) => el.remove());
  styleEl?.remove();
  styleEl = null;
}
