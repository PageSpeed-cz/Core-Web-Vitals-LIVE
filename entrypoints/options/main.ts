import './style.css';

interface OptionsState {
  hudEnabled: boolean;
  clsVizEnabled: boolean;
  inpVizEnabled: boolean;
  lcpVizEnabled: boolean;
  hudPosition: 'bottom-right' | 'bottom-left' | 'top-right';
}

const DEFAULT_OPTIONS: OptionsState = {
  hudEnabled: true,
  clsVizEnabled: true,
  inpVizEnabled: true,
  lcpVizEnabled: true,
  hudPosition: 'bottom-right',
};

const STORAGE_KEY = 'cwv-live-options';

async function loadOptions(): Promise<OptionsState> {
  const data = await browser.storage.sync.get(STORAGE_KEY);
  const stored = data[STORAGE_KEY];
  return { ...DEFAULT_OPTIONS, ...(typeof stored === 'object' && stored ? stored : {}) };
}

async function saveOptions(options: OptionsState): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: options });
}

function render(options: OptionsState): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <h1>Core Web Vitals Live</h1>
    <p class="subtitle">Configure the overlay and visualizations.</p>

    <div class="section">
      <h2>Overlay</h2>
      <div class="toggle-row">
        <div>
          <label for="hud">HUD overlay</label>
          <p class="toggle-desc">Show live metrics in the corner</p>
        </div>
        <input type="checkbox" id="hud" class="toggle-input" ${options.hudEnabled ? 'checked' : ''} />
      </div>
      <div class="toggle-row">
        <label for="position">HUD position</label>
      </div>
      <div class="radio-group">
        <label class="radio-row">
          <input type="radio" name="position" value="bottom-right" ${options.hudPosition === 'bottom-right' ? 'checked' : ''} />
          <span>Bottom right</span>
        </label>
        <label class="radio-row">
          <input type="radio" name="position" value="bottom-left" ${options.hudPosition === 'bottom-left' ? 'checked' : ''} />
          <span>Bottom left</span>
        </label>
        <label class="radio-row">
          <input type="radio" name="position" value="top-right" ${options.hudPosition === 'top-right' ? 'checked' : ''} />
          <span>Top right</span>
        </label>
      </div>
    </div>

    <div class="section">
      <h2>Visualizations</h2>
      <div class="toggle-row">
        <div>
          <label for="cls">CLS (layout shifts)</label>
          <p class="toggle-desc">Purple overlays when content moves</p>
        </div>
        <input type="checkbox" id="cls" class="toggle-input" ${options.clsVizEnabled ? 'checked' : ''} />
      </div>
      <div class="toggle-row">
        <div>
          <label for="inp">INP (interactions)</label>
          <p class="toggle-desc">Badge for slow clicks/taps (&gt;50ms)</p>
        </div>
        <input type="checkbox" id="inp" class="toggle-input" ${options.inpVizEnabled ? 'checked' : ''} />
      </div>
      <div class="toggle-row">
        <div>
          <label for="lcp">LCP (largest content)</label>
          <p class="toggle-desc">Highlight the LCP element</p>
        </div>
        <input type="checkbox" id="lcp" class="toggle-input" ${options.lcpVizEnabled ? 'checked' : ''} />
      </div>
    </div>

    <div class="actions">
      <button type="button" id="save">Save</button>
      <p id="status"></p>
    </div>
  `;

  const saveBtn = document.getElementById('save')!;
  const statusEl = document.getElementById('status')!;

  const getCurrent = (): OptionsState => ({
    hudEnabled: (document.getElementById('hud') as HTMLInputElement).checked,
    clsVizEnabled: (document.getElementById('cls') as HTMLInputElement).checked,
    inpVizEnabled: (document.getElementById('inp') as HTMLInputElement).checked,
    lcpVizEnabled: (document.getElementById('lcp') as HTMLInputElement).checked,
    hudPosition: (document.querySelector('input[name="position"]:checked') as HTMLInputElement)
      ?.value as OptionsState['hudPosition'],
  });

  saveBtn.addEventListener('click', async () => {
    const next = getCurrent();
    await saveOptions(next);
    statusEl.textContent = 'Saved. Reload the page to apply.';
    statusEl.style.color = '#0f9d58';
    setTimeout(() => (statusEl.textContent = ''), 3000);
  });
}

loadOptions().then(render);
