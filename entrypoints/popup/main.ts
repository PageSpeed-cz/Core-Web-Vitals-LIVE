import './style.css';
import type { OptionsState } from '../../lib/types';
import { DEFAULT_OPTIONS } from '../../lib/types';

const STORAGE_KEY = 'cwv-live-options';

async function loadOptions(): Promise<OptionsState> {
  const data = await browser.storage.sync.get(STORAGE_KEY);
  const stored = data[STORAGE_KEY];
  return { ...DEFAULT_OPTIONS, ...(typeof stored === 'object' && stored ? stored : {}) };
}

async function saveOptions(options: OptionsState): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: options });
}

function render(
  options: OptionsState,
  throttled: boolean,
  tabId: number | null,
  hasTab: boolean,
  isActive: boolean,
  onTurnOff: () => void
): void {
  const app = document.getElementById('app')!;

  const statusHtml =
    !hasTab
      ? 'Open a webpage to start'
      : isActive
        ? 'is running… <button type="button" id="turn-off" class="btn-turn-off">Turn off</button>'
        : 'Stopped. Open popup on a tab to start.';

  const logoSvg = `<svg viewBox="50 50 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 150C127.613 150 150 127.615 150 100C150 72.3849 127.613 50 100 50C72.387 50 50 72.3849 50 100C50 127.615 72.3849 150 100 150Z" fill="#FF00AA"/><path d="M90.9479 103.006L91.855 87.9079L117.152 89.3971L90.9479 103.006ZM129.954 92.1142C129.954 87.3428 128.408 83.5804 125.285 80.8591C122.16 78.1377 117.658 76.7611 111.744 76.7611H75.1232L70.9232 124.94H88.764L89.9069 111.468H108.689C115.24 111.468 120.447 109.721 124.246 106.261C128.042 102.8 129.958 98.0625 129.958 92.1163" fill="white"/></svg>`;

  app.innerHTML = `
    <div class="header">
      <a href="https://pagespeed.one/en" target="_blank" rel="noopener" class="logo" title="pagespeed.one">${logoSvg}</a>
      <h1>Core Web Vitals Live</h1>
    </div>
    <p class="status">${statusHtml}</p>

    <section class="section">
      <label class="toggle-row">
        <input type="checkbox" id="throttle" class="toggle-input" ${throttled ? 'checked' : ''} />
        <span class="toggle-label">Emulate slower device</span>
      </label>
      <p class="section-desc">4\u00d7 CPU slowdown + Fast 4G network. A yellow browser bar will appear \u2014 this is normal and required for throttling.</p>
    </section>

    <section class="section">
      <h2 class="section-title">Visualizations</h2>
      <label class="toggle-row">
        <input type="checkbox" id="cls" class="toggle-input" ${options.clsVizEnabled ? 'checked' : ''} />
        <span class="toggle-label">CLS (layout shifts)</span>
      </label>
      <label class="toggle-row">
        <input type="checkbox" id="inp" class="toggle-input" ${options.inpVizEnabled ? 'checked' : ''} />
        <span class="toggle-label">INP (interactions)</span>
      </label>
      <label class="toggle-row">
        <input type="checkbox" id="lcp" class="toggle-input" ${options.lcpVizEnabled ? 'checked' : ''} />
        <span class="toggle-label">LCP (largest content)</span>
      </label>
    </section>
  `;

  const throttleEl = document.getElementById('throttle') as HTMLInputElement;
  throttleEl.addEventListener('change', async () => {
    const enabled = throttleEl.checked;
    if (tabId == null) return;
    const res = await browser.runtime.sendMessage({
      type: 'TOGGLE_THROTTLING',
      tabId,
      enabled,
    });
    if (res?.ok !== true && enabled && res?.error) {
      throttleEl.checked = false;
    }
    await saveOptions({ ...options, throttlingEnabled: enabled });
  });

  function getOptionsFromDOM(): OptionsState {
    return {
      clsVizEnabled: (document.getElementById('cls') as HTMLInputElement).checked,
      inpVizEnabled: (document.getElementById('inp') as HTMLInputElement).checked,
      lcpVizEnabled: (document.getElementById('lcp') as HTMLInputElement).checked,
      throttlingEnabled: (document.getElementById('throttle') as HTMLInputElement).checked,
    };
  }

  function onVizChange() {
    const next = getOptionsFromDOM();
    saveOptions(next).then(() => {
      if (tabId != null) {
        browser.tabs.sendMessage(tabId, { type: 'ACTIVATE' }).catch(() => {});
      }
    });
  }

  (document.getElementById('cls') as HTMLInputElement).addEventListener('change', onVizChange);
  (document.getElementById('inp') as HTMLInputElement).addEventListener('change', onVizChange);
  (document.getElementById('lcp') as HTMLInputElement).addEventListener('change', onVizChange);

  const turnOffEl = document.getElementById('turn-off');
  if (turnOffEl) {
    turnOffEl.addEventListener('click', onTurnOff);
  }
}

async function main(): Promise<void> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tabId = tab?.id ?? null;
  const hasTab = tabId != null && !!tab?.url && !tab.url.startsWith('chrome://');

  let isActive = false;
  if (tabId != null) {
    const activeRes = await browser.runtime.sendMessage({ type: 'IS_TAB_ACTIVE', tabId }).catch(() => ({}));
    isActive = (activeRes as { active?: boolean })?.active === true;
    if (hasTab && !isActive) {
      await browser.runtime.sendMessage({ type: 'ACTIVATE_FOR_TAB', tabId }).catch(() => ({}));
      isActive = true;
    }
  }

  const [options, throttlingState] = await Promise.all([
    loadOptions(),
    tabId != null
      ? browser.runtime.sendMessage({ type: 'GET_THROTTLING_STATE', tabId })
      : Promise.resolve({ throttled: false }),
  ]);

  const throttled = (throttlingState as { throttled?: boolean })?.throttled ?? options.throttlingEnabled;

  function handleTurnOff() {
    if (tabId == null) return;
    browser.runtime.sendMessage({ type: 'DEACTIVATE_FOR_TAB', tabId }).then(() => {
      render(options, throttled, tabId, hasTab, false, handleTurnOff);
    });
  }

  render(options, throttled, tabId, hasTab, isActive, handleTurnOff);
}

main();
