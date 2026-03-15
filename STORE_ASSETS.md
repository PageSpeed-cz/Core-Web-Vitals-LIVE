# Chrome Web Store Assets Checklist

Before submitting to the Chrome Web Store, prepare the following assets.

## Required

### Screenshots (at least 1, up to 5)

- **Size:** 1280 x 800 px or 640 x 400 px
- **Format:** PNG or JPEG
- **What to capture:**
  1. HUD overlay showing live LCP/INP/CLS bars on a real webpage
  2. CLS purple overlays highlighting layout shifts
  3. INP badge showing interaction delay
  4. LCP element outline with label
  5. Popup with metric summary

**How to capture:**

1. Run `npm run build` and load the extension in Chrome
2. Open a webpage (e.g. a news site with ads for CLS, or a complex app for INP)
3. Activate the extension and wait for metrics to populate
4. Use Chrome DevTools Device Toolbar (Ctrl+Shift+M) set to 1280x800 for consistent sizing
5. Take screenshots with `Cmd+Shift+4` (macOS) or the DevTools screenshot tool

Save screenshots to `.github/screenshots/` for reference.

### Small Promo Tile

- **Size:** 440 x 280 px
- **Format:** PNG or JPEG
- **Content:** Extension logo, name "Core Web Vitals Live", and a short tagline

### Extension Icon

- **Size:** 128 x 128 px (already provided via `public/icon/128.png`)

## Optional (Recommended)

### Large (Marquee) Promo Tile

- **Size:** 1400 x 560 px
- **Content:** Wider version of the small promo tile, can include a screenshot or illustration

## Store Listing Text

- **Name:** Core Web Vitals Live
- **Summary (132 chars max):** See your website's performance. Live. Real-time LCP, INP, and CLS metrics with visual overlays.
- **Category:** Developer Tools
- **Language:** English

## Privacy

- **Privacy policy URL:** Link to the hosted `PRIVACY_POLICY.md` (e.g. via GitHub Pages or raw GitHub URL)
- **Single purpose:** Display real-time Core Web Vitals performance metrics with visual overlays
- **Data use disclosure:** No data collected or transmitted externally
