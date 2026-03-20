# Contributing to Core Web Vitals Live

Thanks for your interest in contributing. This document covers local setup, project structure, coding conventions, and the PR process.

## Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node)
- **Chrome** (for testing the extension)

## Development setup

1. **Clone and install**
   ```bash
   git clone https://github.com/PageSpeed-cz/Core-Web-Vitals-LIVE.git
   cd core-web-vitals-live
   npm install
   ```

2. **Run in development**
   ```bash
   npm run dev
   ```
   This builds the extension and can launch Chrome with it loaded. Load or reload the extension from `chrome://extensions` (Developer mode → Load unpacked → select the output folder, e.g. `.output/chrome-mv3`).

3. **After code changes**
   - Run `npm run build` (or keep `npm run dev` running if it watches).
   - In `chrome://extensions`, click the reload icon on the extension.
   - Reload the tab you’re testing (or open a new one) so the content script picks up changes.

## Project structure

- **`entrypoints/`** – WXT entrypoints:
  - **`content.ts`** – Content script: initializes metrics (web-vitals), HUD, and CLS/INP/LCP visualizers; reads options from storage; sends metrics to the background.
  - **`background.ts`** – Service worker: updates badge and stores last metrics per tab for the popup.
  - **`popup/`** – Popup UI (metrics summary, settings toggles, Reload).
- **`lib/`** – Shared logic used by the content script:
  - **`metrics.ts`** – Wraps web-vitals (LCP, INP, CLS, FCP, TTFB); reports all changes.
  - **`types.ts`** – Metric state, options state, thresholds.
  - **`hud.ts`** – HUD overlay (life bars, position, minimize).
  - **`cls-viz.ts`** – CLS layout-shift overlays (PerformanceObserver).
  - **`inp-viz.ts`** – INP slow-interaction badges (Event Timing).
  - **`lcp-viz.ts`** – LCP element highlight.
- **`public/`** – Static assets (e.g. icons).
- **`wxt.config.ts`** – WXT and manifest configuration.

## Coding conventions

- **TypeScript** – Strict mode. Prefer types for public APIs and callbacks.
- **Formatting** – Use the project’s formatter/linter (e.g. ESLint/Prettier if configured). Keep line length and indentation consistent.
- **Naming** – `camelCase` for variables/functions; `PascalCase` for types/classes. Use descriptive names; avoid single-letter names except in short loops.
- **Imports** – Prefer `type` for type-only imports. Group: external packages first, then internal (`lib/`, `entrypoints/`).
- **Content script** – Keep the bundle small; no heavy frameworks. Vanilla TS + DOM is preferred.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- **`feat: ...`** – New feature
- **`fix: ...`** – Bug fix
- **`docs: ...`** – Documentation only
- **`chore: ...`** – Build, tooling, deps
- **`refactor: ...`** – Code change that is not a fix or feature

Examples:

- `feat: add option to hide HUD in iframes`
- `fix: INP badge position on RTL pages`
- `docs: update README install steps`

## Pull request process

1. **Fork** the repo and create a branch from `main` (e.g. `feat/your-feature` or `fix/issue-123`).
2. **Implement** your change and run:
   - `npm run compile` – must pass.
   - `npm run build` – must succeed.
3. **Test** manually in Chrome: load the built extension, reload a test page, check the HUD, popup, options, and any changed visualization.
4. **Commit** with a conventional commit message.
5. **Push** and open a **Pull Request** against `main`. Fill in the PR template (description, testing done, checklist).
6. **Review** – address feedback. Once approved, a maintainer will merge.

## How to test

- **Popup:** Install the extension, open a page, click the extension icon. Check that LCP/INP/CLS appear (or “Open a webpage…” if none). Use Reload and Options.
- **Settings:** Click the extension icon and use the settings toggles in the popup. Toggle HUD, CLS, INP, LCP; reload the test page and confirm behavior.
- **HUD:** With HUD on, confirm life bars update as you interact and scroll. Minimize and restore.
- **CLS:** On a page that shifts layout (e.g. late-loading images or ads), confirm purple overlays and labels appear and fade.
- **INP:** Trigger slow handlers (e.g. heavy JS on click); confirm amber/red badges with duration.
- **LCP:** Confirm the blue “LCP element” outline appears around the largest contentful paint element.
- **Badge:** Check toolbar badge color and text (green/amber/red and value).

If you add new features, please add a short note in the PR on how you tested them.

## Questions

Open a [GitHub Discussion](https://github.com/PageSpeed-cz/Core-Web-Vitals-LIVE/discussions) or an [Issue](https://github.com/PageSpeed-cz/Core-Web-Vitals-LIVE/issues) for bugs and feature requests.

Thank you for contributing.
