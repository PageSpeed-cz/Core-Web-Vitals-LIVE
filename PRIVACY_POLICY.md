# Privacy Policy – Core Web Vitals Live

**Last updated:** March 15, 2026

## Overview

Core Web Vitals Live is a browser extension that measures and displays real-time Core Web Vitals (LCP, INP, CLS) performance metrics for webpages you visit. Your privacy is important to us, and this policy explains what data the extension accesses and how it is used.

## Data Collection

**Core Web Vitals Live does not collect, transmit, or share any personal data.** All data stays on your device.

### What the extension accesses

| Data | Purpose | Storage |
|------|---------|---------|
| Performance metrics (LCP, INP, CLS, FCP, TTFB) | Displayed in the HUD overlay, popup, and toolbar badge | Kept in memory and `chrome.storage.local` (per-tab, cleared on tab close) |
| User preferences (toggle settings, HUD position) | Remembering your configuration | `chrome.storage.sync` (synced across your Chrome devices via your Google account) |
| Active tab URL and status | Updating the toolbar badge for the current tab | Not stored |

### What the extension does NOT do

- Does **not** collect browsing history or personal information.
- Does **not** send any data to external servers, APIs, or third parties.
- Does **not** use analytics, tracking, or telemetry of any kind.
- Does **not** inject ads or modify page content beyond its own overlays.
- Does **not** read or access page content such as form inputs, passwords, or cookies.

## Permissions

| Permission | Why it is needed |
|------------|------------------|
| `activeTab` | Access performance data on the tab you are viewing |
| `tabs` | Update the toolbar badge to reflect the current tab's metrics |
| `storage` | Save your preferences and per-tab metric snapshots |
| `debugger` | Optionally throttle CPU or network speed to simulate slower devices (DevTools protocol) |

The `debugger` permission is used solely for performance throttling simulation. It is never used to read, intercept, or modify network traffic or page data.

## Third-Party Services

The extension loads a Google Fonts stylesheet (`fonts.googleapis.com`) for UI typography. Google's privacy policy applies to that request: <https://policies.google.com/privacy>. No other external services are contacted.

## Data Retention

- **Per-tab metrics** are held in memory and `storage.local` only while the tab is open; they are removed when the tab is closed.
- **User preferences** are stored in `storage.sync` and persist until you change or remove them.
- Uninstalling the extension removes all stored data.

## Changes to This Policy

If this policy is updated, the new version will be published at the same URL and the "Last updated" date will be revised.

## Contact

If you have questions about this privacy policy, please open an issue on the project's GitHub repository.
