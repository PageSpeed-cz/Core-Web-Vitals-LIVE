# Chrome Web Store – Submission Notes

Use this when filling out the Chrome Web Store Developer Dashboard.

## Permission justifications (copy into dashboard fields)

Chrome may show one combined “justification” area or separate fields per permission. Use the paragraphs below as needed.

### `debugger`

> The debugger permission is used only to simulate slower devices when testing Core Web Vitals. The extension uses the Chrome DevTools Protocol to apply CPU throttling and network throttling (e.g. slow 3G) to the current tab so developers can see how their site performs under poor conditions. No network traffic is read, intercepted, or modified; the API is used solely for Emulation.setCPUThrottlingRate and Network.emulateNetworkConditions.

### `tabs`

> Used to read the active tab’s ID and status so the toolbar badge and popup can show Core Web Vitals for the page you are viewing. Tab URLs are not stored or transmitted.

### `storage`

> Stores user preferences (HUD position, feature toggles) in `chrome.storage.sync` and short-lived per-tab metric snapshots in `chrome.storage.local`. All data stays on the user’s device.

### `activeTab`

> Allows the extension to access the current tab when you use the extension (popup, badge updates) so it can measure performance for that page only when relevant.

### Broad site access (`<all_urls>` content script)

> The content script runs on pages the user opens so it can measure LCP, INP, and CLS and draw the optional HUD and metric overlays. It does not send page data or metrics to external servers; everything is processed locally for display in the extension UI.

## Single purpose description

**Single purpose (short):** Display real-time Core Web Vitals (LCP, INP, CLS) performance metrics with visual overlays on web pages.

## Data usage disclosure

- **Does your extension collect or transmit user data?** No (or only as described below)
- **Data handling:** All data stays on the user's device. Performance metrics are shown in the extension UI; user preferences are stored in Chrome sync storage. Nothing is sent to external servers.

## Privacy policy URL (GitHub Pages)

The file [`docs/privacy-policy.html`](./docs/privacy-policy.html) is **generated from** [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md) on every `npm run build` and `npm run zip` (script: `npm run privacy-page`). Edit only `PRIVACY_POLICY.md`.

**Setup:**

1. Push the `docs/` folder to GitHub.
2. **Settings** → **Pages** → **Source:** **Deploy from a branch** → branch **main** (or default) → folder **`/docs`** → **Save**.
3. After ~1 minute, open the URL GitHub shows — typically  
   `https://<username>.github.io/<repository>/privacy-policy.html`

**Chrome Web Store:** paste the full HTTPS URL into the privacy policy field.

**Published URL (this project):**  
[https://pagespeed-cz.github.io/Core-Web-Vitals-LIVE/privacy-policy.html](https://pagespeed-cz.github.io/Core-Web-Vitals-LIVE/privacy-policy.html)

[`docs/.nojekyll`](./docs/.nojekyll) turns off Jekyll so the HTML is served as-is. After you edit `PRIVACY_POLICY.md`, run `npm run privacy-page` (or any `build` / `zip`) and **commit** the updated `docs/privacy-policy.html` so GitHub Pages picks it up.

## Upload package (ZIP)

This repo uses WXT to generate the store-ready ZIP.

```bash
npm ci
npm run zip
```

The ZIP you upload is created at:

- `.output/core-web-vitals-live-<version>-chrome.zip`

## Store assets

See [STORE_ASSETS.md](./STORE_ASSETS.md) for screenshot and promo tile requirements and capture instructions.

## First submission checklist

Use this on the day you publish (order is a suggestion):

- [ ] `npm ci` and `npm run zip` — upload `.output/core-web-vitals-live-<version>-chrome.zip` in Developer Dashboard → **New item**.
- [ ] Load unpacked `.output/chrome-mv3` once more and smoke-test popup, HUD, throttling.
- [ ] Add **3–5 screenshots** (see [STORE_ASSETS.md](./STORE_ASSETS.md)), short + long description, category, language.
- [ ] **Privacy policy URL:** [published privacy page](https://pagespeed-cz.github.io/Core-Web-Vitals-LIVE/privacy-policy.html) (must load over HTTPS).
- [ ] **Data usage** questionnaire — align with [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) (no collection / no remote transmission).
- [ ] **Permission justifications** — copy from the sections above (`debugger`, `tabs`, broad host access, …).
- [ ] Submit for review; after approval, add the public listing URL to [README.md](./README.md) (*Chrome Web Store* section).
