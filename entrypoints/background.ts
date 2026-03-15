/**
 * Core Web Vitals Live – background: badge updates, metrics storage, CPU/network throttling.
 */

declare const chrome: {
  debugger: {
    attach: (target: { tabId: number }, version: string) => Promise<void>;
    detach: (target: { tabId: number }) => Promise<void>;
    sendCommand: (target: { tabId: number }, method: string, params?: object) => Promise<unknown>;
    onDetach: { addListener: (cb: (source: { tabId?: number }) => void) => void };
  };
};

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

function getWorstMetric(metrics: MetricsPayload): { rating: Rating } | null {
  const order: Rating[] = ['poor', 'needs-improvement', 'good'];
  let worst: Rating = 'good';
  let hasAny = false;

  for (const name of ['LCP', 'INP', 'CLS'] as const) {
    const m = metrics[name];
    if (!m) continue;
    hasAny = true;
    if (order.indexOf(m.rating) < order.indexOf(worst)) {
      worst = m.rating;
    }
  }

  if (!hasAny) return null;
  return { rating: worst };
}

/** Fast 4G: 4 Mbps down, 3 Mbps up, 60ms latency (bytes per second) */
const DOWNLOAD_THROUGHPUT = (4 * 1024 * 1024) / 8;
const UPLOAD_THROUGHPUT = (3 * 1024 * 1024) / 8;
const LATENCY_MS = 60;
const CPU_THROTTLE_RATE = 4;

const throttledTabs = new Set<number>();

async function enableThrottling(tabId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.setCPUThrottlingRate', {
      rate: CPU_THROTTLE_RATE,
    });
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable');
    await chrome.debugger.sendCommand({ tabId }, 'Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: DOWNLOAD_THROUGHPUT,
      uploadThroughput: UPLOAD_THROUGHPUT,
      latency: LATENCY_MS,
    });
    throttledTabs.add(tabId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

async function disableThrottling(tabId: number): Promise<void> {
  try {
    await chrome.debugger.detach({ tabId });
  } catch {
    // already detached
  }
  throttledTabs.delete(tabId);
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (
      message: {
        type?: string;
        metrics?: MetricsPayload;
        tabId?: number;
        enabled?: boolean;
      },
      sender,
      sendResponse
    ) => {
      if (message.type === 'METRICS_UPDATE' && message.metrics) {
        const worst = getWorstMetric(message.metrics);
        const tabId = sender.tab?.id;

        const setBadge = (id?: number) => {
          const color = worst ? BADGE_COLORS[worst.rating] : BADGE_COLORS.good;
          browser.action.setBadgeText({
            text: '●',
            ...(id != null && { tabId: id }),
          });
          browser.action.setBadgeTextColor({
            color,
            ...(id != null && { tabId: id }),
          });
          browser.action.setBadgeBackgroundColor({
            color: [0, 0, 0, 0],
            ...(id != null && { tabId: id }),
          });
        };

        setBadge(tabId);
        if (tabId != null) {
          browser.storage.local.get('metrics').then((prev) => {
            const all = (prev.metrics as Record<number, MetricsPayload>) ?? {};
            all[tabId] = message.metrics!;
            browser.storage.local.set({ metrics: all });
          });
        }
        sendResponse?.({ ok: true });
        return;
      }

      if (message.type === 'TOGGLE_THROTTLING' && message.tabId != null) {
        const tabId = message.tabId;
        const enabled = message.enabled === true;
        if (enabled) {
          enableThrottling(tabId).then(sendResponse);
        } else {
          disableThrottling(tabId).then(() => sendResponse?.({ ok: true }));
        }
        return true; // async response
      }

      if (message.type === 'GET_THROTTLING_STATE' && message.tabId != null) {
        sendResponse?.({ throttled: throttledTabs.has(message.tabId) });
        return;
      }

      sendResponse?.({ ok: false });
    }
  );

  chrome.debugger.onDetach.addListener((source: { tabId?: number }) => {
    if (source.tabId != null) throttledTabs.delete(source.tabId);
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    throttledTabs.delete(tabId);
  });
});
