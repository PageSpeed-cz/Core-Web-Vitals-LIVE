# Store assets (Chrome Web Store)

Checklist pro obrázky a související assety. Texty listingu: **[STORE_LISTING_COPY.md](./STORE_LISTING_COPY.md)**. Oprávnění, privacy URL, ZIP: [CHROME_WEB_STORE.md](./CHROME_WEB_STORE.md), [PUBLISHING.md](./PUBLISHING.md).

Oficiální specifikace obrázků: [Supplying images](https://developer.chrome.com/docs/webstore/images).

## Screenshots (snímky rozšíření)

| Co | Hodnota |
| --- | --- |
| **Povolené rozlišení** | přesně **1280×800** nebo **640×400** px (PNG nebo JPEG) |
| **Poměr stran** | **16∶10** (landscape) — **ne čtverec**; jiné rozměry formulář často odmítne |
| **Počet** | minimum **1**, maximum **5** — Google doporučuje **naplnit všech 5** |
| **Úprava** | bez zaoblených rohů a bez „paddingu“ kolem — celý snímek = obsah (full bleed) |

**Proč ne čtverec:** Store screenshoty jsou definované jako 1280×800 nebo 640×400. Čtverec (např. 1200×1200) nesplní podmínku.

**Doporučení:** raději **1280×800** — na Retině vypadají líp; v UI se stejně zmenšují na 640×400, takže drobný text musí být čitelný i po zmenšení.

### Náměty na 5 snímků

1. Celá stránka + **HUD** (LCP / INP / CLS life bars).
2. **CLS** overlay (fialová plocha + hodnota).
3. **INP** badge u interakce.
4. **LCP** obrys a štítek na elementu.
5. **Popup** (metriky + přepínače + případně throttling).

## Ikona rozšíření (v ZIPu)

- **128×128** PNG v balíčku (už je v buildu). Pokyny k „váze“ ikony: [Icon size](https://developer.chrome.com/docs/webstore/images#icon-size).

## Propagační obrázky (promo)

| Typ | Rozměr | Povinnost |
| --- | --- | --- |
| **Small promo tile** | **440×280** px | **Povinné** — bez něj může být listing v přehledech horší pozicovaný |
| **Marquee** | **1400×560** px | Volitelné — pro výraznější propagaci / featured scénáře |

Tipy od Google: vyplnit celý rámeček, sytější barvy, málo bílé, na světle šedém pozadí Store; **moc textu na promo ne** — raději silná grafika / značka.

## Volitelně

- Krátké **video** (např. 10–20 s) — když to dashboard nabídne.
- **Lokalizované** screenshoty pro další jazyky listingu — [Localize your listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#localize-your-listing).

## Čisté screenshoty

- Neutralní testovací stránka nebo vlastní web s kontrolovatelným chováním.
- Rozmazat údaje v UI (účty, e-maily, interní dashboardy).
