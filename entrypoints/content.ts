/**
 * Core Web Vitals Live – content script: metrics, HUD, CLS/INP/LCP visualizers.
 */

import { initMetrics, formatLCP, formatINP, formatCLS, formatFCP, formatTTFB } from '../lib/metrics';
import type { Metric } from '../lib/metrics';
import type { MetricsState, MetricState, OptionsState } from '../lib/types';
import { DEFAULT_OPTIONS } from '../lib/types';
import {
  createHUD,
  updateHUD,
  setHUDPosition,
  type HudPosition,
} from '../lib/hud';
import { initCLSViz } from '../lib/cls-viz';
import { initINPViz } from '../lib/inp-viz';
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
    let hudRoot: HTMLElement | null = null;
    let teardownCLS: (() => void) | null = null;
    let teardownINP: (() => void) | null = null;
    const currentMetrics: Partial<MetricsState> = {};

    function applyOptions(next: OptionsState) {
      options = next;
      if (hudRoot) {
        setHUDPosition(hudRoot, options.hudPosition as HudPosition);
      }
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
      }
    }

    function sendToBackground(metrics: Partial<MetricsState>) {
      const payload: Record<string, { value: number; rating: string; label: string; badgeLabel?: string } | null> = {};
      for (const k of ['LCP', 'INP', 'CLS'] as const) {
        const m = metrics[k];
        payload[k] = m
          ? { value: m.value, rating: m.rating, label: m.label, badgeLabel: m.badgeLabel ?? undefined }
          : null;
      }
      browser.runtime.sendMessage({ type: 'METRICS_UPDATE', metrics: payload }).catch(() => {});
    }

    function onMetric(name: string, metric: Metric) {
      let state: MetricState | null = null;
      switch (name) {
        case 'LCP':
          state = metricToState(metric, formatLCP);
          currentMetrics.LCP = state;
          if (options.lcpVizEnabled && metric.entries?.length) {
            const last = metric.entries[metric.entries.length - 1] as PerformanceEntry & { element?: Element | null };
            if (last?.element) showLCPElement(last.element);
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
      if (options.hudEnabled && hudRoot && state && ['LCP', 'INP', 'CLS'].includes(name)) {
        updateHUD(hudRoot, { [name]: state });
      }
      if (['LCP', 'INP', 'CLS'].includes(name)) {
        sendToBackground(currentMetrics);
      }
    }

    function init() {
      if (options.hudEnabled) {
        hudRoot = createHUD({ position: options.hudPosition as HudPosition });
        updateHUD(hudRoot, currentMetrics);
      }
      if (options.clsVizEnabled) teardownCLS = initCLSViz();
      if (options.inpVizEnabled) teardownINP = initINPViz();

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
      if (stored) applyOptions({ ...DEFAULT_OPTIONS, ...stored });
      init();
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[STORAGE_KEY]) {
        const next = (changes[STORAGE_KEY].newValue ?? {}) as Partial<OptionsState>;
        applyOptions({ ...options, ...next });
        if (options.hudEnabled && !hudRoot) {
          hudRoot = createHUD({ position: options.hudPosition as HudPosition });
          updateHUD(hudRoot, currentMetrics);
        } else if (!options.hudEnabled && hudRoot) {
          hudRoot.remove();
          hudRoot = null;
        }
      }
    });
  },
});
