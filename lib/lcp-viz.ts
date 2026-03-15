/**
 * pagespeed.One – LCP visualizer: pulsating border and label on the LCP element.
 */

const PREFIX = 'cwv-live-lcp';
const Z_INDEX = 2147483644;

const STYLES = `
.${PREFIX}-overlay {
  position: fixed;
  pointer-events: none;
  z-index: ${Z_INDEX};
  border: 3px solid rgba(255, 0, 170, 0.8);
  border-radius: 6px;
  box-sizing: border-box;
  animation: ${PREFIX}-pulse 2s ease-in-out infinite;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.3) inset;
}
.${PREFIX}-label {
  position: absolute;
  top: -26px;
  left: 0;
  font-family: 'Special Gothic Expanded One', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #fff;
  background: rgba(255, 0, 170, 0.92);
  padding: 3px 10px;
  border-radius: 4px;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
@keyframes ${PREFIX}-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 1px rgba(255,255,255,0.3) inset, 0 0 12px rgba(255,0,170,0.4); }
  50% { opacity: 0.85; box-shadow: 0 0 0 1px rgba(255,255,255,0.3) inset, 0 0 24px rgba(255,0,170,0.6); }
}
`;

let styleEl: HTMLStyleElement | null = null;
let overlayEl: HTMLDivElement | null = null;
let updateRaf: number | null = null;
let currentElement: Element | null = null;

function ensureStyles(): void {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

function updatePosition(): void {
  if (!overlayEl || !currentElement) return;
  try {
    const rect = currentElement.getBoundingClientRect();
    overlayEl.style.left = `${rect.left}px`;
    overlayEl.style.top = `${rect.top}px`;
    overlayEl.style.width = `${rect.width}px`;
    overlayEl.style.height = `${rect.height}px`;
  } catch {
    hideLCPElement();
  }
}

function tick(): void {
  updateRaf = null;
  updatePosition();
}

function scheduleUpdate(): void {
  if (updateRaf != null) return;
  updateRaf = requestAnimationFrame(tick);
}

export function showLCPElement(element: Element | null): void {
  ensureStyles();
  if (!element) {
    hideLCPElement();
    return;
  }
  currentElement = element;

  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }

  overlayEl = document.createElement('div');
  overlayEl.className = `${PREFIX}-overlay`;
  overlayEl.innerHTML = `<span class="${PREFIX}-label">LCP element</span>`;
  document.body.appendChild(overlayEl);

  updatePosition();

  const onScrollOrResize = () => scheduleUpdate();
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);

  const observer = new MutationObserver(() => {
    if (!currentElement?.isConnected) hideLCPElement();
    else scheduleUpdate();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const cleanup = () => {
    window.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
    observer.disconnect();
  };

  (overlayEl as unknown as { _cleanup?: () => void })._cleanup = cleanup;
}

export function hideLCPElement(): void {
  if (updateRaf != null) {
    cancelAnimationFrame(updateRaf);
    updateRaf = null;
  }
  const el = overlayEl as unknown as { _cleanup?: () => void };
  if (el?._cleanup) el._cleanup();
  overlayEl?.remove();
  overlayEl = null;
  currentElement = null;
}

export function destroyLCPViz(): void {
  hideLCPElement();
  styleEl?.remove();
  styleEl = null;
}
