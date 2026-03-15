/**
 * Core Web Vitals Live – shared types for metrics and UI state.
 */

export type MetricRating = 'good' | 'needs-improvement' | 'poor';

export interface MetricState {
  value: number;
  rating: MetricRating;
  /** Display label e.g. "2.1s", "180ms", "0.08" */
  label: string;
  /** Raw value for badge (e.g. 340 for INP ms) */
  badgeLabel?: string;
}

export interface MetricsState {
  LCP: MetricState | null;
  INP: MetricState | null;
  CLS: MetricState | null;
  FCP: MetricState | null;
  TTFB: MetricState | null;
}

export interface OptionsState {
  hudEnabled: boolean;
  clsVizEnabled: boolean;
  inpVizEnabled: boolean;
  lcpVizEnabled: boolean;
  hudPosition: 'bottom-right' | 'bottom-left' | 'top-right';
}

export const DEFAULT_OPTIONS: OptionsState = {
  hudEnabled: true,
  clsVizEnabled: true,
  inpVizEnabled: true,
  lcpVizEnabled: true,
  hudPosition: 'bottom-right',
};

/** Thresholds: [good max, poor min] - same as web-vitals */
export const LCP_THRESHOLDS: [number, number] = [2500, 4000];
export const INP_THRESHOLDS: [number, number] = [200, 500];
export const CLS_THRESHOLDS: [number, number] = [0.1, 0.25];
