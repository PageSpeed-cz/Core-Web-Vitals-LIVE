/**
 * Core Web Vitals Live – metrics collection via web-vitals (with attribution where needed).
 * Reports all changes so HUD and badge stay live.
 */

import {
  onLCP,
  onINP,
  onCLS,
  onFCP,
  onTTFB,
} from 'web-vitals';
import {
  onLCP as onLCPAttribution,
  onINP as onINPAttribution,
  onCLS as onCLSAttribution,
} from 'web-vitals/attribution';
import type { Metric } from 'web-vitals';

export type { Metric };

export interface MetricsCallbacks {
  onMetric?: (name: string, metric: Metric) => void;
  onLCP?: (metric: Metric & { entries: PerformanceEntry[] }) => void;
  onINP?: (metric: Metric) => void;
  onCLS?: (metric: Metric) => void;
  onFCP?: (metric: Metric) => void;
  onTTFB?: (metric: Metric) => void;
}

function formatLCP(value: number): string {
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function formatINP(value: number): string {
  return `${Math.round(value)}ms`;
}

function formatCLS(value: number): string {
  return value.toFixed(2);
}

function formatFCP(value: number): string {
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function formatTTFB(value: number): string {
  return `${Math.round(value)}ms`;
}

/**
 * Initialize web-vitals and report every metric update to the given callbacks.
 * Uses reportAllChanges so HUD and badge update live.
 */
export function initMetrics(callbacks: MetricsCallbacks): void {
  const reportAllChanges = true;

  const report = (name: string, metric: Metric) => {
    callbacks.onMetric?.(name, metric);
    switch (name) {
      case 'LCP':
        callbacks.onLCP?.(metric as Metric & { entries: PerformanceEntry[] });
        break;
      case 'INP':
        callbacks.onINP?.(metric);
        break;
      case 'CLS':
        callbacks.onCLS?.(metric);
        break;
      case 'FCP':
        callbacks.onFCP?.(metric);
        break;
      case 'TTFB':
        callbacks.onTTFB?.(metric);
        break;
    }
  };

  // LCP with attribution (we need element from entries; attribution gives selector)
  onLCPAttribution((metric) => {
    report('LCP', metric);
  }, { reportAllChanges });

  onINP((metric) => {
    report('INP', metric);
  }, { reportAllChanges });

  onCLS((metric) => {
    report('CLS', metric);
  }, { reportAllChanges });

  onFCP((metric) => {
    report('FCP', metric);
  }, { reportAllChanges });

  onTTFB((metric) => {
    report('TTFB', metric);
  }, { reportAllChanges });
}

export {
  formatLCP,
  formatINP,
  formatCLS,
  formatFCP,
  formatTTFB,
};
