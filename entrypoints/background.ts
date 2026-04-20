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

const ICON_PATHS = {
  default: {
    16: 'icon/16.png',
    32: 'icon/32.png',
    48: 'icon/48.png',
    96: 'icon/96.png',
    128: 'icon/128.png',
  },
  good: {
    16: 'icon/status/green-16.png',
    32: 'icon/status/green-32.png',
    48: 'icon/status/green-48.png',
    96: 'icon/status/green-96.png',
    128: 'icon/status/green-128.png',
  },
  'needs-improvement': {
    16: 'icon/status/orange-16.png',
    32: 'icon/status/orange-32.png',
    48: 'icon/status/orange-48.png',
    96: 'icon/status/orange-96.png',
    128: 'icon/status/orange-128.png',
  },
  poor: {
    16: 'icon/status/red-16.png',
    32: 'icon/status/red-32.png',
    48: 'icon/status/red-48.png',
    96: 'icon/status/red-96.png',
    128: 'icon/status/red-128.png',
  },
} as const;

type IconVariant = keyof typeof ICON_PATHS;

function ratingToVariant(rating: Rating | null | undefined): IconVariant {
  if (!rating) return 'default';
  return rating;
}

/** Fast 4G: 4 Mbps down, 3 Mbps up, 60ms latency (bytes per second) */
const DOWNLOAD_THROUGHPUT = (4 * 1024 * 1024) / 8;
const UPLOAD_THROUGHPUT = (3 * 1024 * 1024) / 8;
const LATENCY_MS = 60;
const CPU_THROTTLE_RATE = 4;

const throttledTabs = new Set<number>();
/** Tabs where the overlay (HUD + viz) is active; survives page reload until tab close or user turn off */
const activeOverlayTabs = new Set<number>();
const tabWorstRatings = new Map<number, Rating | null>();

async function setActionIconForTab(tabId: number, rating: Rating | null): Promise<void> {
  const variant = ratingToVariant(rating);
  await browser.action.setIcon({
    tabId,
    path: ICON_PATHS[variant],
  });

  // We use the icon itself for state; keep badge empty.
  await browser.action.setBadgeText({ tabId, text: '' });
}

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
  browser.action.onClicked.addListener((tab) => {
    const tabId = tab.id;
    if (tabId == null) return;
    // Always show the HUD on click. Enabled/disabled state is controlled inside the HUD.
    browser.tabs.sendMessage(tabId, { type: 'SHOW_HUD' }).catch(() => {});
  });

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

        if (tabId != null) {
          const rating = worst?.rating ?? null;
          tabWorstRatings.set(tabId, rating);
          setActionIconForTab(tabId, rating).catch(() => {});
        }
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

      if (message.type === 'GET_TAB_STATE') {
        const tabId = message.tabId ?? sender.tab?.id;
        if (tabId == null) {
          sendResponse?.({ ok: false });
          return;
        }
        sendResponse?.({
          ok: true,
          active: activeOverlayTabs.has(tabId),
          throttled: throttledTabs.has(tabId),
        });
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

      if (message.type === 'TOGGLE_THROTTLING' && message.tabId == null) {
        const tabId = sender.tab?.id;
        if (tabId == null) {
          sendResponse?.({ ok: false });
          return;
        }
        const enabled = message.enabled === true;
        if (enabled) {
          enableThrottling(tabId).then(sendResponse);
        } else {
          disableThrottling(tabId).then(() => sendResponse?.({ ok: true }));
        }
        return true;
      }

      if (message.type === 'GET_THROTTLING_STATE' && message.tabId != null) {
        sendResponse?.({ throttled: throttledTabs.has(message.tabId) });
        return;
      }

      if (message.type === 'IS_TAB_ACTIVE' && message.tabId != null) {
        sendResponse?.({ active: activeOverlayTabs.has(message.tabId) });
        return;
      }

      if (message.type === 'ACTIVATE_FOR_TAB' && message.tabId != null) {
        const tabId = message.tabId;
        activeOverlayTabs.add(tabId);
        browser.tabs.sendMessage(tabId, { type: 'ACTIVATE' }).catch(() => {});
        sendResponse?.({ active: true });
        return;
      }

      if (message.type === 'ACTIVATE_FOR_TAB' && message.tabId == null) {
        const tabId = sender.tab?.id;
        if (tabId == null) {
          sendResponse?.({ ok: false });
          return;
        }
        activeOverlayTabs.add(tabId);
        browser.tabs.sendMessage(tabId, { type: 'ACTIVATE' }).catch(() => {});
        sendResponse?.({ active: true });
        return;
      }

      if (message.type === 'DEACTIVATE_FOR_TAB' && message.tabId != null) {
        const tabId = message.tabId;
        activeOverlayTabs.delete(tabId);
        browser.tabs.sendMessage(tabId, { type: 'DEACTIVATE' }).catch(() => {});
        sendResponse?.({ ok: true });
        return;
      }

      if (message.type === 'DEACTIVATE_FOR_TAB' && message.tabId == null) {
        const tabId = sender.tab?.id;
        if (tabId == null) {
          sendResponse?.({ ok: false });
          return;
        }
        activeOverlayTabs.delete(tabId);
        browser.tabs.sendMessage(tabId, { type: 'DEACTIVATE' }).catch(() => {});
        sendResponse?.({ ok: true });
        return;
      }

      if (message.type === 'CONTENT_READY') {
        const tabId = sender.tab?.id;
        if (tabId != null && activeOverlayTabs.has(tabId)) {
          browser.tabs.sendMessage(tabId, { type: 'ACTIVATE' }).catch(() => {});
        }
        sendResponse?.({ ok: true });
        return;
      }

      sendResponse?.({ ok: false });
    }
  );

  chrome.debugger.onDetach.addListener((source: { tabId?: number }) => {
    if (source.tabId != null) throttledTabs.delete(source.tabId);
  });

  browser.tabs.onActivated.addListener(({ tabId }) => {
    const rating = tabWorstRatings.get(tabId) ?? null;
    setActionIconForTab(tabId, rating).catch(() => {});
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    throttledTabs.delete(tabId);
    activeOverlayTabs.delete(tabId);
    tabWorstRatings.delete(tabId);
  });
});
