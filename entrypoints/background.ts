/**
 * Core Web Vitals Live – background: badge updates from content script metrics.
 */

const BADGE_COLORS = {
  good: '#0CCE6B',
  'needs-improvement': '#FFA400',
  poor: '#FF4E42',
} as const;

type Rating = keyof typeof BADGE_COLORS;

interface MetricPayload {
  value: number;
  rating: Rating;
  label: string;
  badgeLabel?: string;
}

interface MetricsPayload {
  LCP?: MetricPayload | null;
  INP?: MetricPayload | null;
  CLS?: MetricPayload | null;
}

function getWorstMetric(metrics: MetricsPayload): { rating: Rating; text: string } | null {
  const order: Rating[] = ['poor', 'needs-improvement', 'good'];
  let worst: Rating = 'good';
  let worstValue: number | null = null;
  let worstLabel: string = '';

  for (const name of ['LCP', 'INP', 'CLS'] as const) {
    const m = metrics[name];
    if (!m) continue;
    const r = m.rating;
    if (order.indexOf(r) < order.indexOf(worst)) {
      worst = r;
      worstValue = m.value;
      worstLabel = m.badgeLabel ?? m.label;
    } else if (r === worst && m.value > (worstValue ?? 0)) {
      worstValue = m.value;
      worstLabel = m.badgeLabel ?? m.label;
    }
  }

  if (worst === 'good' && worstLabel === '') return null;
  return { rating: worst, text: worstLabel || '✓' };
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: { type?: string; metrics?: MetricsPayload }, sender, sendResponse) => {
      if (message.type !== 'METRICS_UPDATE' || !message.metrics) {
        sendResponse?.({ ok: false });
        return;
      }
      const worst = getWorstMetric(message.metrics);
      const tabId = sender.tab?.id;

      const setBadge = (id?: number) => {
        if (worst) {
          browser.action.setBadgeBackgroundColor({
            color: BADGE_COLORS[worst.rating],
            ...(id != null && { tabId: id }),
          });
          browser.action.setBadgeText({
            text: worst.text.length > 4 ? String(Math.round(parseFloat(worst.text) || 0)) : worst.text,
            ...(id != null && { tabId: id }),
          });
        } else {
          browser.action.setBadgeBackgroundColor({
            color: BADGE_COLORS.good,
            ...(id != null && { tabId: id }),
          });
          browser.action.setBadgeText({
            text: '✓',
            ...(id != null && { tabId: id }),
          });
        }
      };

      setBadge(tabId);
      const metrics = message.metrics;
      if (tabId != null && metrics) {
        browser.storage.local.get('metrics').then((prev) => {
          const all = (prev.metrics as Record<number, MetricsPayload>) ?? {};
          all[tabId] = metrics;
          browser.storage.local.set({ metrics: all });
        });
      }
      sendResponse?.({ ok: true });
    }
  );
});
