/**
 * Core Web Vitals Live – content script: metrics, HUD, CLS/INP/LCP visualizers.
 * Passive by default (metrics + badge only). HUD and visualizations activate on ACTIVATE message.
 */

import { initMetrics, formatLCP, formatINP, formatCLS, formatFCP, formatTTFB } from '../lib/metrics';
import type { Metric } from '../lib/metrics';
import type { MetricsState, MetricState, OptionsState } from '../lib/types';
import { DEFAULT_OPTIONS } from '../lib/types';
import { createHUD, destroyHUD, updateHUD } from '../lib/hud';
import { initCLSViz, destroyCLSViz } from '../lib/cls-viz';
import { initINPViz, destroyINPViz } from '../lib/inp-viz';
import { showLCPElement, destroyLCPViz } from '../lib/lcp-viz';
import { PRIVACY_POLICY_PAGE_URL } from '../lib/privacy-policy-url';

const STORAGE_KEY = 'cwv-live-options';
const LOGO_URL = 'https://pagespeed.one/en';
const TEST_INSIGHTS_URL = 'https://pagespeed.one/en/app/insights';
const EXTENSION_HOME_URL = 'https://github.com/PageSpeed-cz/Core-Web-Vitals-LIVE';

function metricToState(metric: Metric, format: (v: number) => string): MetricState {
  return {
    value: metric.value,
    rating: metric.rating,
    label: format(metric.value),
    badgeLabel:
      metric.name === 'LCP'
        ? metric.value < 1000
          ? String(Math.round(metric.value))
          : (metric.value / 1000).toFixed(1)
        : metric.name === 'INP'
          ? String(Math.round(metric.value))
          : metric.value.toFixed(2),
  };
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    let options: OptionsState = { ...DEFAULT_OPTIONS };
    let overlayActive = false;
    let hudRoot: HTMLElement | null = null;
    let hudFrame: HTMLIFrameElement | null = null;
    let hudWrap: HTMLDivElement | null = null;
    let hudFrameReady = false;
    let hudUsingLegacyDom = false;
    let teardownCLS: (() => void) | null = null;
    let teardownINP: (() => void) | null = null;
    let lastLCPElement: Element | null = null;
    const currentMetrics: Partial<MetricsState> = {};
    let extensionContextInvalidated = false;
    let throttled = false;
    let hudReadyTimeout: number | null = null;

    function safeSendMessage(message: unknown) {
      if (extensionContextInvalidated) return;
      // When the extension reloads/updates, content scripts can keep running briefly.
      // Guard against "Extension context invalidated" causing uncaught errors.
      if (!browser?.runtime?.id) return;
      try {
        const maybePromise = browser.runtime.sendMessage(message as any);
        // Some implementations may throw synchronously, others reject asynchronously.
        if (maybePromise && typeof (maybePromise as any).catch === 'function') {
          (maybePromise as Promise<unknown>).catch((err: unknown) => {
            const msg = (err as any)?.message ?? String(err);
            if (typeof msg === 'string' && msg.toLowerCase().includes('extension context invalidated')) {
              extensionContextInvalidated = true;
              deactivate();
              return;
            }
          });
        }
      } catch (err: unknown) {
        const msg = (err as any)?.message ?? String(err);
        if (typeof msg === 'string' && msg.toLowerCase().includes('extension context invalidated')) {
          extensionContextInvalidated = true;
          deactivate();
        }
      }
    }

    function applyOptions(next: OptionsState) {
      options = next;
      if (!overlayActive) return;

      if (!options.clsVizEnabled && teardownCLS) {
        teardownCLS();
        teardownCLS = null;
      } else if (options.clsVizEnabled && !teardownCLS) {
        teardownCLS = initCLSViz();
      }
      if (!options.inpVizEnabled && teardownINP) {
        teardownINP();
        teardownINP = null;
      } else if (options.inpVizEnabled && !teardownINP) {
        teardownINP = initINPViz();
      }
      if (!options.lcpVizEnabled) {
        destroyLCPViz();
      } else if (options.lcpVizEnabled && lastLCPElement) {
        showLCPElement(lastLCPElement, currentMetrics.LCP?.value);
      }
    }

    function saveOptions(partial: Partial<OptionsState>) {
      options = { ...options, ...partial };
      browser.storage.sync.set({ [STORAGE_KEY]: options }).catch(() => {});
      sendHudState();
      applyOptions(options);
    }

    function isHudOpen(): boolean {
      return !!(hudFrame || hudUsingLegacyDom);
    }

    function sendHudState() {
      if (hudUsingLegacyDom) {
        if (!hudRoot) return;
        updateHUD(
          hudRoot,
          {
            LCP: currentMetrics.LCP,
            INP: currentMetrics.INP,
            CLS: currentMetrics.CLS,
          },
          {
            active: overlayActive,
            throttled,
            options,
          }
        );
        return;
      }

      if (!hudFrame || !hudFrame.contentWindow) return;
      // If the iframe isn't ready yet, we'll send state on HUD_READY.
      if (!hudFrameReady) return;
      hudFrame.contentWindow.postMessage(
        {
          source: 'cwv-live-parent',
          type: 'HUD_STATE',
          metrics: {
            LCP: currentMetrics.LCP ?? null,
            INP: currentMetrics.INP ?? null,
            CLS: currentMetrics.CLS ?? null,
          },
          ui: {
            throttled,
            options,
          },
          urls: {
            test: TEST_INSIGHTS_URL,
            home: EXTENSION_HOME_URL,
            privacy: PRIVACY_POLICY_PAGE_URL,
            pagespeed: LOGO_URL,
          },
        },
        '*'
      );
    }

    function ensureHUD() {
      if (hudFrame || hudUsingLegacyDom) return;
      hudWrap = document.createElement('div');
      hudWrap.id = 'cwv-live-hud-wrap';
      hudWrap.style.position = 'fixed';
      hudWrap.style.zIndex = '2147483646';
      hudWrap.style.pointerEvents = 'auto';
      hudWrap.style.borderRadius = '16px';
      hudWrap.style.boxShadow = '0 16px 44px rgba(0,0,0,0.55)';
      hudWrap.style.border = '0';
      // Keep the wrapper visually neutral. Backdrop blur on the host page can cause
      // expensive repaints and (on some sites) contribute to layout instability while dragging.
      hudWrap.style.background = 'transparent';
      hudWrap.style.isolation = 'isolate';
      (hudWrap.style as any).contain = 'layout paint style';
      hudWrap.style.willChange = 'transform';
      hudWrap.style.top = options.hudPosition?.top != null ? `${options.hudPosition.top}px` : '16px';
      hudWrap.style.left = options.hudPosition?.left != null ? `${options.hudPosition.left}px` : 'auto';
      hudWrap.style.right = options.hudPosition ? 'auto' : '16px';

      hudFrame = document.createElement('iframe');
      hudFrame.id = 'cwv-live-hud-frame';
      hudFrame.src = browser.runtime.getURL('/hud-frame.html' as any);
      hudFrame.style.border = '0';
      hudFrame.style.background = 'transparent';
      hudFrame.style.width = '400px';
      hudFrame.style.height = '1px'; // will be resized from iframe
      hudFrame.style.pointerEvents = 'auto';
      hudFrame.style.borderRadius = '16px';
      hudFrame.style.overflow = 'hidden';
      hudFrameReady = false;
      let ghost: HTMLDivElement | null = null;
      let ghostStartLeft = 0;
      let ghostStartTop = 0;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
      let dragStartLeft = 0;
      let dragStartTop = 0;
      let dragging = false;
      let pendingLeft = 0;
      let pendingTop = 0;
      let raf = 0;
      let pendingSize: { w: number | null; h: number | null } = { w: null, h: null };

      window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg || msg.source !== 'cwv-live-hud') return;
        if (msg.type === 'HUD_READY') {
          hudFrameReady = true;
          if (hudReadyTimeout != null) {
            window.clearTimeout(hudReadyTimeout);
            hudReadyTimeout = null;
          }
          sendHudState();
          return;
        }
        if (msg.type === 'HUD_SIZE') {
          const h = typeof msg.height === 'number' ? Math.max(1, Math.min(1000, msg.height)) : null;
          const w = typeof msg.width === 'number' ? Math.max(240, Math.min(480, msg.width)) : null;
          if (dragging) {
            pendingSize = { w, h };
            return;
          }
          if (hudFrame && h != null) hudFrame.style.height = `${h}px`;
          if (hudWrap && h != null) hudWrap.style.height = `${h}px`;
          if (hudFrame && w != null) hudFrame.style.width = `${w}px`;
          if (hudWrap && w != null) hudWrap.style.width = `${w}px`;
          return;
        }
        if (msg.type === 'HUD_DRAG_START') {
          if (!hudWrap) return;
          const rect = hudWrap.getBoundingClientRect();
          dragOffsetX = (msg.clientX ?? 0) - rect.left;
          dragOffsetY = (msg.clientY ?? 0) - rect.top;
          dragStartLeft = rect.left;
          dragStartTop = rect.top;
          pendingLeft = rect.left;
          pendingTop = rect.top;
          dragging = true;
          // While dragging, don't let the iframe capture page interactions as "INP on the page".
          if (hudFrame) hudFrame.style.pointerEvents = 'none';
          hudWrap.style.opacity = '0';

          ghost = document.createElement('div');
          ghost.id = 'cwv-live-hud-ghost';
          ghost.style.position = 'fixed';
          ghost.style.zIndex = '2147483647';
          ghost.style.left = `${rect.left}px`;
          ghost.style.top = `${rect.top}px`;
          ghost.style.width = `${rect.width}px`;
          ghost.style.height = `${rect.height}px`;
          ghost.style.borderRadius = '16px';
          ghost.style.border = '2px solid rgba(255,255,255,0.22)';
          ghost.style.background = 'rgba(0,0,0,0.06)';
          ghost.style.boxShadow = '0 16px 44px rgba(0,0,0,0.35)';
          ghost.style.pointerEvents = 'none';
          ghost.style.willChange = 'transform';
          ghost.style.cursor = 'move';
          document.documentElement.appendChild(ghost);

          ghostStartLeft = rect.left;
          ghostStartTop = rect.top;
          return;
        }
        if (msg.type === 'HUD_DRAG_MOVE') {
          if (!dragging || !ghost) return;
          const dx = typeof msg.dx === 'number' ? msg.dx : (msg.clientX ?? 0) - dragOffsetX - dragStartLeft;
          const dy = typeof msg.dy === 'number' ? msg.dy : (msg.clientY ?? 0) - dragOffsetY - dragStartTop;
          pendingLeft = Math.max(0, dragStartLeft + dx);
          pendingTop = Math.max(0, dragStartTop + dy);
          if (!raf) {
            raf = requestAnimationFrame(() => {
              raf = 0;
              if (!ghost) return;
              const tx = pendingLeft - ghostStartLeft;
              const ty = pendingTop - ghostStartTop;
              ghost.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
            });
          }
          return;
        }
        if (msg.type === 'HUD_DRAG_END') {
          dragging = false;
          if (!hudWrap) return;
          if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
          if (hudFrame) hudFrame.style.pointerEvents = 'auto';
          hudWrap.style.opacity = '1';
          hudWrap.style.right = 'auto';
          hudWrap.style.left = `${pendingLeft}px`;
          hudWrap.style.top = `${pendingTop}px`;
          saveOptions({ hudPosition: { top: Math.max(0, pendingTop), left: Math.max(0, pendingLeft) } });

          if (ghost) {
            try {
              ghost.remove();
            } catch {}
          }
          ghost = null;

          if (pendingSize.w != null) {
            hudFrame!.style.width = `${pendingSize.w}px`;
            hudWrap.style.width = `${pendingSize.w}px`;
          }
          if (pendingSize.h != null) {
            hudFrame!.style.height = `${pendingSize.h}px`;
            hudWrap.style.height = `${pendingSize.h}px`;
          }
          pendingSize = { w: null, h: null };
          return;
        }
        if (msg.type === 'HUD_CLOSE') {
          safeSendMessage({ type: 'DEACTIVATE_FOR_TAB' });
          safeSendMessage({ type: 'TOGGLE_THROTTLING', enabled: false });
          throttled = false;
          hideHUD();
          return;
        }
        if (msg.type === 'HUD_OPTIONS_EXPANDED') {
          saveOptions({ hudOptionsExpanded: msg.expanded === true });
          return;
        }
        if (msg.type === 'HUD_SET_OPTION') {
          saveOptions((msg.partial ?? {}) as Partial<OptionsState>);
          return;
        }
        if (msg.type === 'HUD_TOGGLE_THROTTLING') {
          const enabled = msg.enabled === true;
          safeSendMessage({ type: 'TOGGLE_THROTTLING', enabled });
          throttled = enabled;
          saveOptions({ throttlingEnabled: enabled });
          sendHudState();
          return;
        }
      });

      hudWrap.appendChild(hudFrame);
      document.documentElement.appendChild(hudWrap);

      // If the iframe is blocked by CSP `frame-src` on the host page, it will never post HUD_READY.
      // In that case, fall back to the legacy in-page HUD so users can still control the overlay.
      hudReadyTimeout = window.setTimeout(() => {
        if (hudFrameReady || !hudFrame) return;
        // fallback
        hudUsingLegacyDom = true;
        try {
          hudFrame.remove();
        } catch {}
        hudFrame = null;
        try {
          hudWrap?.remove();
        } catch {}
        hudWrap = null;
        hudRoot = createHUD({
          callbacks: {
            onToggleActive: (nextActive: boolean) => {
              if (nextActive) safeSendMessage({ type: 'ACTIVATE_FOR_TAB' });
              else safeSendMessage({ type: 'DEACTIVATE_FOR_TAB' });
            },
            onClose: () => {
              safeSendMessage({ type: 'DEACTIVATE_FOR_TAB' });
              safeSendMessage({ type: 'TOGGLE_THROTTLING', enabled: false });
              throttled = false;
              hideHUD();
            },
            onSetOptionsExpanded: (expanded: boolean) => saveOptions({ hudOptionsExpanded: expanded }),
            onSetOption: (partial: Partial<OptionsState>) => saveOptions(partial),
            onToggleThrottling: (enabled: boolean) => {
              safeSendMessage({ type: 'TOGGLE_THROTTLING', enabled });
              throttled = enabled;
              saveOptions({ throttlingEnabled: enabled });
            },
            onSetPosition: (pos: { top: number; left: number }) => saveOptions({ hudPosition: pos }),
          },
          ui: {
            active: overlayActive,
            throttled,
            options,
          },
        });
        sendHudState();
      }, 1200);
    }

    function showHUD() {
      ensureHUD();
      sendHudState();
      browser.runtime
        .sendMessage({ type: 'GET_TAB_STATE' })
        .then((res) => {
          const r = res as { ok?: boolean; active?: boolean; throttled?: boolean } | undefined;
          if (!r || r.ok !== true) return;
          overlayActive = r.active === true;
          throttled = r.throttled === true;
          sendHudState();
        })
        .catch(() => {});
    }

    function hideHUD() {
      if (hudReadyTimeout != null) {
        window.clearTimeout(hudReadyTimeout);
        hudReadyTimeout = null;
      }
      hudFrame?.remove();
      hudFrame = null;
      hudWrap?.remove();
      hudWrap = null;
      hudFrameReady = false;
      destroyHUD(); // legacy cleanup (no-op if not present)
      hudRoot = null;
      hudUsingLegacyDom = false;
    }

    function activate() {
      overlayActive = true;
      showHUD();
      applyOptions(options);
    }

    function deactivate() {
      overlayActive = false;
      if (teardownCLS) {
        teardownCLS();
        teardownCLS = null;
      }
      if (teardownINP) {
        teardownINP();
        teardownINP = null;
      }
      destroyLCPViz();
      destroyCLSViz();
      destroyINPViz();
      lastLCPElement = null;
      sendHudState();
    }

    function sendToBackground(metrics: Partial<MetricsState>) {
      const payload: Record<string, { value: number; rating: string; label: string; badgeLabel?: string } | null> = {};
      for (const k of ['LCP', 'INP', 'CLS'] as const) {
        const m = metrics[k];
        payload[k] = m
          ? { value: m.value, rating: m.rating, label: m.label, badgeLabel: m.badgeLabel ?? undefined }
          : null;
      }
      safeSendMessage({ type: 'METRICS_UPDATE', metrics: payload });
    }

    function onMetric(name: string, metric: Metric) {
      let state: MetricState | null = null;
      switch (name) {
        case 'LCP':
          state = metricToState(metric, formatLCP);
          currentMetrics.LCP = state;
          if (metric.entries?.length) {
            const last = metric.entries[metric.entries.length - 1] as PerformanceEntry & { element?: Element | null };
            if (last?.element) lastLCPElement = last.element;
          }
          if (overlayActive && options.lcpVizEnabled && lastLCPElement) {
            showLCPElement(lastLCPElement, state.value);
          }
          break;
        case 'INP':
          state = metricToState(metric, formatINP);
          currentMetrics.INP = state;
          break;
        case 'CLS':
          state = metricToState(metric, formatCLS);
          currentMetrics.CLS = state;
          break;
        case 'FCP':
          state = metricToState(metric, formatFCP);
          currentMetrics.FCP = state;
          break;
        case 'TTFB':
          state = metricToState(metric, formatTTFB);
          currentMetrics.TTFB = state;
          break;
      }
      if (isHudOpen() && state && ['LCP', 'INP', 'CLS'].includes(name)) {
        sendHudState();
      }
      if (['LCP', 'INP', 'CLS'].includes(name)) {
        sendToBackground(currentMetrics);
      }
    }

    // Passive init: only metrics (for badge)
    function init() {
      initMetrics({
        onLCP: (m) => onMetric('LCP', m),
        onINP: (m) => onMetric('INP', m),
        onCLS: (m) => onMetric('CLS', m),
        onFCP: (m) => onMetric('FCP', m),
        onTTFB: (m) => onMetric('TTFB', m),
      });
    }

    browser.storage.sync.get(STORAGE_KEY).then((data) => {
      const stored = data[STORAGE_KEY];
      if (stored) options = { ...DEFAULT_OPTIONS, ...stored };
      init();
      safeSendMessage({ type: 'CONTENT_READY' });
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[STORAGE_KEY]) {
        const next = (changes[STORAGE_KEY].newValue ?? {}) as Partial<OptionsState>;
        options = { ...options, ...next };
        applyOptions(options);
        sendHudState();
      }
    });

    browser.runtime.onMessage.addListener(
      (message: { type?: string }, _sender, sendResponse) => {
        if (message.type === 'ACTIVATE') {
          activate();
          sendResponse({ ok: true });
        } else if (message.type === 'DEACTIVATE') {
          deactivate();
          sendResponse({ ok: true });
        } else if (message.type === 'SHOW_HUD') {
          showHUD();
          sendResponse({ ok: true });
        } else if (message.type === 'HIDE_HUD') {
          hideHUD();
          sendResponse({ ok: true });
        }
      }
    );
  },
});
