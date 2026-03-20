# Chrome Web Store — listing copy

Copy-paste ready text for the Developer Dashboard. Limits and tips: [Creating a compelling listing](https://developer.chrome.com/docs/webstore/best_listing).

---

## Short description (summary)

**Limit:** max. **132 characters** — shown in search results, category pages, homepage.

```
Don't just measure Core Web Vitals — see them. Live HUD and visual overlays pinpoint exactly what's hurting LCP, INP, and CLS.
```

(126 characters)

---

## Detailed description

Chrome Web Store allows simple formatting in the description field. Copy the block below.

```
Other tools give you numbers. Core Web Vitals Live shows you the problem.

A game-style HUD displays LCP, INP, and CLS as color-coded life bars right on the page — green, amber, or red at a glance. But the real power is in the visual overlays: see the exact element causing your Largest Contentful Paint, watch layout shifts highlighted in real time as they happen, and spot slow interactions with duration badges that appear right where you clicked. No more guessing which element is the culprit — it's highlighted on screen.

Built on Google's official web-vitals library with the same thresholds used by PageSpeed Insights and Search Console. Zero data collection, zero external requests — everything runs locally in your browser.

FEATURES

Live HUD overlay
LCP, INP, and CLS displayed as color-coded life bars in a corner of your page. Green → amber → red tells you instantly if something's wrong. Minimizable and repositionable.

See your LCP element
A pulsing blue border and label highlight the exact element responsible for your Largest Contentful Paint. No more digging through DevTools — it's right there on the page.

Watch layout shifts happen
Every CLS event is visualized as a purple overlay on the shifted element with its score (e.g. "CLS +0.03"). You'll finally understand where your layout instability comes from.

Spot slow interactions instantly
After every click or tap, an INP badge appears near your cursor: amber for 50–200 ms, red for >200 ms. You'll know immediately which interaction is dragging your score down.

Toolbar badge
The extension icon turns green, amber, or red and shows your worst metric value — performance status visible without even opening anything.

Device throttling
Simulate slow CPU and network conditions to test how your site performs for users on low-end devices.

Privacy-first
No data leaves your browser. No accounts, no tracking, no external API calls. Your browsing stays yours.

Aligned with Google's tools
Uses the official web-vitals library — the same measurement logic and thresholds as PageSpeed Insights, Search Console, and CrUX.
```

---

## Localization

You can add more languages in the dashboard (e.g. Czech) — separate fields for short/long description and optionally locale-specific screenshots.

## Promo images (see [STORE_ASSETS.md](./STORE_ASSETS.md))

- Small promo **440×280 px** — required; `assets/promo-small-440x280.png` is ready.
- Optional **marquee 1400×560 px** — for featured placement.

## Competitive positioning (internal notes, not for listing)

Key differentiator: **"Other tools show numbers. This one shows you the problem."**

- Core Web Vitals Visualizer (corewebvitals.io) — strong on CrUX history and data, but focuses on charts, not on-page debugging.
- Core Web Vitals Test (Google) — audit tool comparing desktop/mobile via PageSpeed API, not real-time.
- Core Web Vitals history (RUMvision) — historical CrUX field data, different category.
- Page Speed & Core Web Vitals — generic description, no clear differentiator.
