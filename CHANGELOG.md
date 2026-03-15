# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Optional CrUX field data (with user API key)
- Optional “cost of poor CWV” / business-impact view
- Draggable HUD position

## [0.1.0] - 2025-03-14

### Added

- Initial release.
- Live HUD overlay with LCP, INP, and CLS as “life bars” (green / amber / red).
- CLS visualization: purple overlays on layout-shifted areas with fade-out.
- INP visualization: badge near cursor/target for slow interactions (>50 ms), amber 50–200 ms, red >200 ms.
- LCP visualization: pulsating border and “LCP element” label on the LCP element.
- Toolbar badge: color and value reflecting worst metric.
- Popup: current metrics summary, progress bars, Reload page, Options link.
- Options page: toggles for HUD, CLS/INP/LCP visualizations; HUD position (bottom-right, bottom-left, top-right); settings synced via Chrome sync.
- Metrics measured with [web-vitals](https://github.com/GoogleChrome/web-vitals) (LCP, INP, CLS, FCP, TTFB); report-all-changes for live updates.
- Chrome (Manifest V3) and Chromium-based browsers support; Firefox build via `npm run build:firefox`.

[Unreleased]: https://github.com/machal/Core-Web-Vitals-Live/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/machal/Core-Web-Vitals-Live/releases/tag/v0.1.0
