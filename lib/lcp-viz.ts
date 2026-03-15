/**
 * pagespeed.One – LCP visualizer: pulsating border and label on the LCP element.
 */

const PREFIX = 'cwv-live-lcp';
const Z_INDEX = 2147483644;

const LCP_GOOD_MS = 2500;
const LCP_POOR_MS = 4000;

function lcpColor(ms: number): string {
  if (ms <= LCP_GOOD_MS) return '#0CCE6B';
  if (ms <= LCP_POOR_MS) return '#FFA400';
  return '#FF4E42';
}

function formatLCPMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function makeLabelHTML(prefix: string, valueText: string, valueColor: string): string {
  return `${prefix}: <span style="font-family:'Mona Sans',system-ui,sans-serif;font-weight:600;font-variant-numeric:tabular-nums;color:${valueColor}">${valueText}</span>`;
}

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
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  font-family: 'Special Gothic Expanded One', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(16, 16, 36, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 20px;
  border-radius: 4px;
  white-space: nowrap;
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

export function showLCPElement(element: Element | null, lcpMs?: number): void {
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

  const valueText = lcpMs != null ? formatLCPMs(lcpMs) : '';
  const valueColor = lcpMs != null ? lcpColor(lcpMs) : '#ffffff';
  const labelInner = lcpMs != null
    ? makeLabelHTML('LCP Element', valueText, valueColor)
    : 'LCP Element';

  overlayEl = document.createElement('div');
  overlayEl.className = `${PREFIX}-overlay`;
  overlayEl.innerHTML = `<span class="${PREFIX}-label">${labelInner}</span>`;
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
