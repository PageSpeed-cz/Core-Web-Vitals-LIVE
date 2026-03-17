# Publishing (Chrome Web Store)

This repo uses [WXT](https://wxt.dev/) to generate a **Manifest V3** extension build and a **store-ready ZIP**.

## What you upload to the Chrome Web Store

Upload the ZIP produced by:

```bash
npm run zip
```

It will be created at:

- `.output/core-web-vitals-live-<version>-chrome.zip`

## One-time setup (Chrome Web Store)

1. Create a Chrome Web Store developer account.
2. In the Developer Dashboard, create a new item.
3. Upload the ZIP from `.output/`.
4. Fill out the listing (description, screenshots, category).
5. Fill out **Data usage** (this extension does not collect or transmit user data; see `PRIVACY_POLICY.md`).
6. If asked for permission justification (notably `debugger`), use the text in `CHROME_WEB_STORE.md`.

## Release checklist (technical)

### 1) Update version

WXT uses the version from `package.json` for the built `manifest.json`.

Pick one:

```bash
npm version patch
```

```bash
npm version minor
```

```bash
npm version major
```

This updates `package.json` (and creates a git tag if you commit it).

### 2) Build + typecheck

```bash
npm ci
npm run compile
npm run build
```

Build output:

- `.output/chrome-mv3/` (unpacked extension folder)
- `.output/chrome-mv3/manifest.json` (the actual MV3 manifest that ships)

### 3) Create the store ZIP

```bash
npm run zip
```

### 4) Smoke test the exact build you’re uploading

In Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `.output/chrome-mv3/`

### 5) Upload to the Chrome Web Store

Upload `.output/core-web-vitals-live-<version>-chrome.zip` and submit for review.

## Updating an existing Chrome Web Store listing

1. Bump version in `package.json` (see above).
2. Run `npm run zip`.
3. Upload the new ZIP as an update in the Developer Dashboard.

## Notes

- `manifest.json` in the repo root mirrors the current build output shape for reference, but the shipped manifest is generated into `.output/chrome-mv3/manifest.json`.
- This extension does not make automatic external network requests. Any external navigation only happens if the user clicks a link in the UI.
