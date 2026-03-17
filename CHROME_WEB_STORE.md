# Chrome Web Store – Submission Notes

Use this when filling out the Chrome Web Store Developer Dashboard.

## Permission justification: `debugger`

**Copy this into the "Justification" field for the debugger permission:**

> The debugger permission is used only to simulate slower devices when testing Core Web Vitals. The extension uses the Chrome DevTools Protocol to apply CPU throttling and network throttling (e.g. slow 3G) to the current tab so developers can see how their site performs under poor conditions. No network traffic is read, intercepted, or modified; the API is used solely for Emulation.setCPUThrottlingRate and Network.emulateNetworkConditions.

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
