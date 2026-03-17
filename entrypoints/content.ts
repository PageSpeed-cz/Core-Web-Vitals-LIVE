/**
 * Core Web Vitals Live – content script: metrics, HUD, CLS/INP/LCP visualizers.
 * Passive by default (metrics + badge only). HUD and visualizations activate on ACTIVATE message.
 */

import { initMetrics, formatLCP, formatINP, formatCLS, formatFCP, formatTTFB } from '../lib/metrics';
import type { Metric } from '../lib/metrics';
import type { MetricsState, MetricState, OptionsState } from '../lib/types';
import { DEFAULT_OPTIONS } from '../lib/types';
import { createHUD, updateHUD, destroyHUD } from '../lib/hud';
import { initCLSViz, destroyCLSViz } from '../lib/cls-viz';
import { initINPViz, destroyINPViz } from '../lib/inp-viz';
import { showLCPElement, destroyLCPViz } from '../lib/lcp-viz';

const STORAGE_KEY = 'cwv-live-options';

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
    let activated = false;
    let hudRoot: HTMLElement | null = null;
    let teardownCLS: (() => void) | null = null;
    let teardownINP: (() => void) | null = null;
    let lastLCPElement: Element | null = null;
    const currentMetrics: Partial<MetricsState> = {};
    let extensionContextInvalidated = false;

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
      if (!activated) return;

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

    function ensureHUD() {
      if (!hudRoot) {
        hudRoot = createHUD();
        updateHUD(hudRoot, currentMetrics);
      }
    }

    function activate() {
      if (activated) return;
      activated = true;
      ensureHUD();
      applyOptions(options);
    }

    function deactivate() {
      if (!activated) return;
      activated = false;
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
      destroyHUD();
      hudRoot = null;
      lastLCPElement = null;
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
          if (activated && options.lcpVizEnabled && lastLCPElement) {
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
      if (hudRoot && state && ['LCP', 'INP', 'CLS'].includes(name)) {
        updateHUD(hudRoot, { [name]: state });
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
        }
      }
    );
  },
});
