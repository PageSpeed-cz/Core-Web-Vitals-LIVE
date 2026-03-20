/**
 * Writes docs/privacy-policy.html from PRIVACY_POLICY.md (for GitHub Pages).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = join(root, 'PRIVACY_POLICY.md');
const outDir = join(root, 'docs');
const outPath = join(outDir, 'privacy-policy.html');

marked.setOptions({ gfm: true });

const md = readFileSync(mdPath, 'utf8');
const body = marked.parse(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy – Core Web Vitals Live</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.15rem; margin-top: 1.75rem; }
    h3 { font-size: 1.05rem; margin-top: 1.25rem; }
    table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
    th, td { border: 1px solid #8884; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
    th { font-weight: 600; }
    code { font-size: 0.88em; }
    blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 3px solid #8886; font-size: 0.95rem; }
    .note { font-size: 0.85rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #8884; }
  </style>
</head>
<body>
${body}
<p class="note">This file is generated from <code>PRIVACY_POLICY.md</code> by <code>npm run privacy-page</code> (also run automatically before <code>npm run build</code> and <code>npm run zip</code>). Do not edit <code>docs/privacy-policy.html</code> by hand.</p>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log('Generated', outPath);
