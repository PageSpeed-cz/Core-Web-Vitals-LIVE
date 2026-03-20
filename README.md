# Core Web Vitals Live

**See your website's performance. Live.**

A Chrome (and Chromium) extension that shows real-time [Core Web Vitals](https://web.dev/vitals/) (LCP, INP, CLS) on any page, with a game-like HUD and visual overlays so you can see exactly what’s hurting your metrics.

<!-- TODO: Add screenshot — see ./STORE_ASSETS.md for guidance -->

## Features

- **Live HUD overlay** – LCP, INP, and CLS as “life bars” in a corner of the page (green → amber → red). Minimizable and position configurable.
- **CLS visualization** – Purple semi-transparent overlays on layout-shifted areas with a small “CLS +0.03” style label; fade out after a few seconds.
- **INP visualization** – Badge near the cursor or target for slow interactions (>50 ms): amber for 50–200 ms, red for >200 ms, with duration in ms.
- **LCP visualization** – Pulsing border and “LCP element” label around the current Largest Contentful Paint element.
- **Toolbar badge** – Green / amber / red with the worst metric value so you see status at a glance.
- **Popup** – Summary of current metrics with progress bars, settings toggles, and Reload.
- **Settings (in popup)** – Toggle HUD, CLS/INP/LCP visualizations. Settings sync across devices (Chrome sync).

All metrics are measured with the same logic and thresholds as [web-vitals](https://github.com/GoogleChrome/web-vitals) and Google tools (Page Speed Insights, Search Console, CrUX).

## Installation

### From source (development / Load unpacked)

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/machal/Core-Web-Vitals-Live.git
   cd core-web-vitals-live
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. In Chrome: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `core-web-vitals-live/.output/chrome-mv3` folder (or the root folder if your build outputs there).
4. Pin the extension if you like; the badge and popup will reflect the active tab’s metrics.

### Chrome Web Store (when published)

1. From the repo root: `npm ci`, then `npm run zip` — upload `.output/core-web-vitals-live-<version>-chrome.zip` (see [PUBLISHING.md](./PUBLISHING.md)).
2. Copy permission and privacy answers from [CHROME_WEB_STORE.md](./CHROME_WEB_STORE.md); screenshots: [STORE_ASSETS.md](./STORE_ASSETS.md).

*(Public store link: add here after publication.)*

## Usage

1. Install the extension and open any webpage.
2. The **badge** (toolbar icon) turns green / amber / red and shows the worst metric value.
3. If the **HUD** is enabled (default), a small overlay in one corner shows LCP, INP, and CLS as life bars. Click the **−** to minimize.
4. **CLS**: any layout shift is highlighted with a purple overlay and value.
5. **INP**: slow clicks/taps show a duration badge (amber or red) near the interaction.
6. **LCP**: the current LCP element is outlined with a blue border and “LCP element” label.
7. Click the extension icon for the **popup** (summary + settings toggles + Reload).

## Metric thresholds

| Metric | Good        | Needs improvement | Poor    |
|--------|-------------|-------------------|---------|
| **LCP** | ≤ 2.5 s     | ≤ 4 s             | > 4 s   |
| **INP** | ≤ 200 ms    | ≤ 500 ms          | > 500 ms |
| **CLS** | ≤ 0.1       | ≤ 0.25            | > 0.25  |

These match [web.dev’s Core Web Vitals](https://web.dev/vitals/#core-web-vitals) thresholds.

## Browser support

- **Chrome 88+** (Manifest V3) – primary target.
- **Edge, Brave, Opera** and other Chromium-based browsers – should work when loaded as an unpacked extension.
- **Firefox** – build with `npm run build:firefox` and load the generated extension (MV3 support in recent Firefox).
- **Safari** – not supported yet.

## Development

- **Prerequisites:** Node.js 18+, npm.
- **Install:** `npm install`
- **Dev mode (watch + reload):** `npm run dev` – builds and runs Chrome with the extension loaded; reload the extension or tab after code changes as needed.
- **Build:** `npm run build` → output in `.output/chrome-mv3/`.
- **Build for Firefox:** `npm run build:firefox`
- **Type check:** `npm run compile`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for project structure, commit conventions, and how to run tests.

## Roadmap

- [ ] Optional [CrUX](https://developer.chrome.com/docs/crux/) field data (with your API key) for comparison with real-user data.
- [ ] Optional “cost of poor CWV” / business-impact view (e.g. rough conversion or revenue impact).
- [ ] More HUD positions and optional draggable overlay.

## Privacy

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) for details on data handling. The extension does not collect or transmit any personal data.

## License

[Apache-2.0](./LICENSE)

## Related

- [web-vitals](https://github.com/GoogleChrome/web-vitals) – library used for measuring LCP, INP, CLS, FCP, TTFB.
- [Web Vitals extension (archived)](https://github.com/GoogleChrome/web-vitals-extension) – original Chrome extension; this project continues the idea with a focus on live overlays and visualizations.
- [Page Speed Insights](https://pagespeed.web.dev/) – lab and field data for a URL.
