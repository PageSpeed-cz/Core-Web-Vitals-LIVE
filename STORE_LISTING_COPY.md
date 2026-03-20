# Chrome Web Store — texty listingu (návrh)

Sem si můžeš dopsat finální verze a kopírovat je do Developer Dashboard. Limity a tipy: [Creating a compelling listing](https://developer.chrome.com/docs/webstore/best_listing).

## Krátký popis (summary)

**Limit:** typicky **max. 132 znaků** — zobrazuje se v přehledech a výsledcích hledání.

**Návrh (EN):**

```
Live LCP, INP & CLS on any site—HUD life bars, CLS/INP/LCP overlays, badge. Optional CPU/network throttling. No data collection.
```

*(Ověř aktuální limit ve formuláři; když to ořízne, zkrátit.)*

## Dlouhý popis (detail)

**Bez tvrdého limitu** — přehled + odrážky funkcí. Můžeš použít jednoduché formátování, které dashboard nabízí.

**Návrh (EN):**

```
See your website’s Core Web Vitals as you browse—no need to open DevTools or run Lighthouse for a quick sanity check.

**What you get**
• Live HUD: LCP, INP, and CLS as color-coded “life bars” (green → amber → red); minimizable, position options.
• Visual feedback: CLS highlights on shifting regions, INP badges for slow interactions, LCP outline on the largest element.
• Toolbar badge: worst metric at a glance.
• Popup: summary, toggles for each visualization, optional “emulate slower device” (CPU + network throttling via Chrome’s debugger API).

**Trust**
Metrics follow the same web-vitals logic as Google’s tools. No personal data is collected or sent to servers—see the linked privacy policy.

**For**
Developers, SEOs, and performance-minded teams who want instant CWV feedback on real pages.
```

## Lokalizace

V dashboardu můžeš přidat **další jazyky** (např. češtinu) — samostatné pole pro krátký/dlouhý popis a volitelně screenshoty pro daný locale.

## Propagační obrázky (viz [STORE_ASSETS.md](./STORE_ASSETS.md))

- Malý promo obrázek **440×280 px** — **povinný**; spíš grafika / značka než hustý text (doporučení Google).
- Volitelně **marquee 1400×560 px** — lepší šance na výraznější zobrazení ve Store.

Texty na promo obrázcích Google spíš nedoporučuje; když už, krátký claim + silná barva.
