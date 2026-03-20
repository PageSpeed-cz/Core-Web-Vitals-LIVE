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

## Privacy policy URL

Use a stable URL where your privacy policy is hosted, for example:

- GitHub Pages: `https://<your-username>.github.io/Core-Web-Vitals-Live/PRIVACY_POLICY` (enable Pages and copy `PRIVACY_POLICY.md` as the source, or use a tool that renders Markdown)
- Raw GitHub (readable): `https://github.com/machal/Core-Web-Vitals-Live/blob/main/PRIVACY_POLICY.md`

Note: The Chrome Web Store may require a dedicated webpage; raw GitHub might not be accepted. Prefer hosting a proper HTML page (e.g. via GitHub Pages with a theme that renders the Markdown).

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
