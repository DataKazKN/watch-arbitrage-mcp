# Watch Arbitrage Tracker (Patek/Rolex/AP)

![Watch Arbitrage Tracker — Spot mispriced Patek, Rolex & AP across 13 marketplaces](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/01-hero.png)

> Cross-platform price arbitrage tool for **professional watch dealers** trading **Patek Philippe**, **Rolex**, and **Audemars Piguet (AP)** across **13 verified marketplaces**: **Chrono24**, **WatchBox / The 1916 Company** (2024 merger of WatchBox + **Govberg Jewelers** + **Hyde Park Jewelers**), **Bob's Watches**, **Watchfinder UK**, **European Watch Co (Boston)**, **Watches of Switzerland** (Mayors / Mappin & Webb / Goldsmiths group), **The Watch Club** (London + HK office), **H. Spliedt** (Munich/Hamburg/Sylt), **A Collected Man** (London), **Analog:Shift** (NYC vintage), **Bachmann & Scher** (Munich), **Yahoo Auctions Japan**, plus the dormant Hodinkee Shop slot. **Real-time Telegram alerts** when a listing is mispriced cross-platform, with **cross-country spread framing** (JP↔US, EU↔US) for global flippers.

**Free to install. Current live pricing: $0.05 per reference on Free/Bronze, discounted reference pricing on Silver/Gold+, $1.50-$2.00 when a real cross-platform spread alert is sent, and $0.001 per listing written to the dataset. No monthly minimum.**

▶ **[Try Watch Arbitrage free](https://apify.com/kazkn/watch-arbitrage-mcp?fpr=8fp2od)** — pro dealers catch their first cross-platform mispriced listing in under 10 min. Pay only when a real spread fires.

## What does Watch Arbitrage Tracker do?

This Actor monitors a list of watch references you care about (e.g. `5711/1A`, `116500LN`, `15500ST`) across **13 dealer marketplaces simultaneously**, computes the **cross-platform median price**, and fires a **Telegram alert** the moment any listing drops more than `X%` (default 5%) below the cross-platform median — or surfaces a **cross-country spread** ("JP $148.2k ↔ US $192.5k") if you switch `compare_mode` to `cross_country_pair`.

It runs on **Apify proxy + Camoufox** (a stealthy Firefox fork) so Cloudflare-protected sites like Chrono24 and Bob's Watches are scraped reliably. Schedule it once an hour and you have a real-time arbitrage radar — packaged as a transparent **Pay-Per-Event** Actor.

### Platform coverage (verified 2026-05-18, build 0.1.27)

| Source                          | Country | Status                                                                                  | Notes                                                                                   |
| ------------------------------- | ------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Chrono24**                    | EU      | ✅ Live                                                                                 | Largest global marketplace; widest variance — most arbitrage signals come from here     |
| **WatchBox / The 1916 Company** | US      | ✅ Live                                                                                 | Premium US dealer (ex-Govberg + ex-Hyde Park merger 2024). Domain: `the1916company.com` |
| **Bob's Watches**               | US      | ✅ Live                                                                                 | Rolex specialist, Newport Beach CA. Cloudflare-protected — Camoufox handles             |
| **Watchfinder UK**              | UK      | ✅ Live                                                                                 | UK leader (Richemont Group)                                                             |
| **European Watch Co**           | US      | ✅ Live                                                                                 | Boston pre-owned, strong Patek inventory                                                |
| **Watches of Switzerland**      | UK      | ✅ Live                                                                                 | Patek often "price on request"; Rolex/AP works when in stock                            |
| **The Watch Club**              | UK      | ✅ Live                                                                                 | London HQ + HK office — UK pre-owned with HK shipping                                   |
| **H. Spliedt**                  | DE      | ✅ Live                                                                                 | Munich/Hamburg/Sylt premium pre-owned, EUR pricing                                      |
| **A Collected Man**             | UK      | ✅ Live                                                                                 | London premium pre-owned + archive                                                      |
| **Analog:Shift**                | US      | ✅ Live                                                                                 | NYC vintage + neo-vintage Patek specialist                                              |
| **Bachmann & Scher**            | DE      | ✅ Live                                                                                 | Munich pre-owned, EUR pricing                                                           |
| **Yahoo Auctions Japan**        | JP      | ⚠️ Geo-blocked from EEA/UK — set `proxyConfiguration.apifyProxyCountry: 'JP'` to enable |
| Hodinkee Shop                   | US      | ⚠️ Dormant (post-merger announcement, near-zero inventory)                              |

**11 of 13 sources confirmed actively delivering median signals.** Yahoo JP needs JP residential proxy (one-line config). Hodinkee kept in enum for back-compat when stock returns.

## Why use Watch Arbitrage Tracker?

- **Stop tab-switching**: 13 sources (US + UK + DE + JP + EU coverage) monitored on every run, no manual refresh.
- **Find spreads other dealers miss**: a Daytona listed cheap on WatchBox while three other dealers list it $5K higher on Chrono24 = instant flip. We surface it before it sells.
- **TRUE cross-platform median**: median is computed across all sources that returned listings for your sub-ref — not single-platform anchoring like Watchcharts or Bezel Club.
- **EU↔US arbitrage built-in**: simplified import/VAT estimate (+20%) on EU listings so US dealers know the true landed cost.
- **Telegram-native**: dealers live on Telegram. Alerts land in your group chat with brand+sub-ref, asking price, median, spread % below median, and a one-tap link to the listing.
- **Pay only when you win**: PPE pricing — monitoring and dataset rows stay low-cost, while the main value event is the paid spread alert ($1.50-$2.00 depending on Apify plan) when a real opportunity is dispatched.

## How to use Watch Arbitrage Tracker

### Step 1 — Quick Start (just 3 fields)

Pick the watches to monitor + alert sensitivity + alert channel. Smart defaults handle the rest.

![Quick Start input section — references, spread sensitivity, alert channel](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/02-input-quick-start.png)

### Step 2 — Telegram bot setup (one-time, 2 minutes)

Open Telegram, search for **@BotFather** (verified by Telegram with a blue check):

![@BotFather verified bot profile in Telegram](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/06-botfather-profile.png)

Tap _Message_ → type `/newbot` → choose any name (e.g. "Watch Arbitrage"):

![BotFather /newbot flow — name your new bot](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/07-botfather-newbot.png)

BotFather will reply with your **bot token** (a long string like `8602184201:AAEa...`). Copy it. Then paste it into the Telegram setup section of the input form, along with your numeric chat ID (get it via `@userinfobot`):

![Telegram setup — bot token + chat ID input fields](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/03-input-telegram-setup.png)

### Step 3 — (Optional) Filters

Refine which listings count toward arbitrage detection — by condition (new / pre-owned / vintage) and box-and-papers status (full-set / box-only / etc.):

![Filter listings by condition and box-and-papers status](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/04-input-filters.png)

### Step 4 — (Optional) Advanced

Defaults work great for most dealers. Tweak only if you have a specific need (e.g. exclude UK/EU sources):

![Advanced options — marketplaces and listing cap](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/05-input-advanced.png)

### Step 5 — Click Start (or schedule it)

The Actor runs in ~5 minutes. Telegram pings on real spreads with asking price + cross-platform median + a one-tap listing link.

> **Tip — recommended ref portfolio size:** the more refs you monitor, the more cross-platform signals surface. 3-5 refs proves the concept; 15-30 refs catches real flippable spreads multiple times per week. Volume dealers run 50+ refs.

## Input

The Apify Console form is grouped in sections (Quick Start, Telegram setup, Filters, Advanced). Smart defaults work for most dealers.

| Field                               | Type            | Description                                                                                                                                                                                                                         |
| ----------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references`                        | string[]        | **Precise reference numbers recommended** (e.g. `5711/1A-010`, `116500LN`, `15500ST.OO.1220ST.04`). Model names like `Nautilus`, `Daytona`, `Royal Oak` are accepted but produce less precise spread alerts (sub-models conflated). |
| `spread_sensitivity`                | enum string     | `"3"` to `"20"` — % below cross-platform median to trigger alert. Default `"5"` (recommended balance).                                                                                                                              |
| `alert_channel`                     | enum            | `telegram` / `email` / `both` / `dataset_only`. Default `telegram`. Email sends one run-level digest when spreads are detected.                                                                                                     |
| `alert_telegram_bot_token`          | string (secret) | Bot token from `@BotFather`. Required for Telegram.                                                                                                                                                                                 |
| `alert_telegram_chat_id`            | string          | Numeric chat ID via `@userinfobot`.                                                                                                                                                                                                 |
| `alert_email`                       | string          | Email address that receives the digest. Required for `email` or `both`.                                                                                                                                                             |
| `filter_conditions`                 | enum[]          | Only include listings with these conditions: `new`, `like-new`, `very-good`, `good`, `fair`, `vintage`, `pre-owned`, `unknown`.                                                                                                     |
| `strict_condition_matching`         | bool            | When `true`: exclude listings where condition couldn't be reliably scraped. Pair with Bobs + Watchfinder + European Watch for clean filtering.                                                                                      |
| `filter_box_papers`                 | enum[]          | `full-set`, `box-and-papers`, `papers-only`, `box-only`, `watch-only`, `unknown`.                                                                                                                                                   |
| `platforms`                         | enum[]          | Default: 6 production sources. 7 extra specialist sources are opt-in, including Yahoo JP for JP-proxied runs. Hodinkee is dormant but kept in enum for backward-compat.                                                             |
| `max_listings_per_ref_per_platform` | int             | Cap to control compute cost (default 10). Raise only after the economics preflight passes.                                                                                                                                          |

Example input:

```json
{
    "references": ["5711/1A-010", "116500LN", "124060", "15500ST.OO.1220ST.04"],
    "platforms": ["chrono24", "watchbox", "bobs", "watchfinder", "europeanwatch", "watchesofswitzerland"],
    "spread_sensitivity": "5",
    "alert_channel": "both",
    "alert_telegram_chat_id": "123456789",
    "alert_email": "dealer@example.com",
    "filter_conditions": ["new", "like-new", "very-good", "pre-owned"],
    "strict_condition_matching": false
}
```

## Output

Three artifacts per run:

1. **Dataset** — every individual listing scraped (CSV / JSON / Excel export).
2. **`MARKET_SNAPSHOT`** (KV store) — per-reference median, min, max, count across selected platforms.
3. **`ARBITRAGE_OPPORTUNITIES`** (KV store) — only the listings that crossed the spread threshold.

### Dataset table view (Apify Console "Output" tab)

Every individual listing scraped, with reference, brand, marketplace, price (USD-normalized), original currency, year, dealer, location, and direct listing URL. Sortable, filterable, exportable as JSON / CSV / Excel:

![Dataset table view — every listing scraped across all platforms](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/09-output-dataset-table.png)

### `ARBITRAGE_OPPORTUNITIES` (key-value store) — only the spreads that fired

Real arbitrage opportunities from a build 0.1.18 cloud run, formatted as JSON. Includes the full `listing` object plus the cross-platform `median_usd` + `spread_usd` + `spread_pct`:

![ARBITRAGE_OPPORTUNITIES key-value store — real spreads detected](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/10-output-arbitrage-opportunities.png)

### `MARKET_SNAPSHOT` (key-value store) — per-sub-ref aggregate stats

Median / min / max / count + the list of platforms that contributed listings, for every sub-ref detected on the run:

![MARKET_SNAPSHOT key-value store — per-sub-ref median/min/max](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/11-output-market-snapshot.png)

### Apify Console run summary

Every run lands in the Console with a clean status header (Succeeded / Failed), runtime, compute units, total cost, and links to the dataset + KV store + live view URL:

![Apify Console run summary — Succeeded, 30/0, $0.167, 7m 58s](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/12-console-run-summary.png)

Sample dataset item (Patek 5711/1A-010 listed on Chrono24):

```json
{
    "ref": "5711/1A-010",
    "brand": "patek-philippe",
    "platform": "chrono24",
    "title": "Patek Philippe Nautilus 5711/1A-010 - Calibre 324 S C",
    "price_usd": 110982,
    "price_orig": 102450,
    "currency": "EUR",
    "listing_url": "https://www.chrono24.com/patekphilippe/nautilus--id45152307.htm",
    "dealer": "European Watch Co.",
    "condition": "Very good",
    "condition_normalized": "very-good",
    "box_papers": "full-set",
    "year": 2018,
    "location": "DE",
    "scraped_at": "2026-05-05T15:55:00.000Z"
}
```

Sample arbitrage opportunity (real result from build 0.1.18 cloud run, 2026-05-06):

```json
{
    "ref": "124060",
    "brand": "rolex",
    "median_usd": 13988,
    "spread_usd": 3938,
    "spread_pct": 28.2,
    "listing": {
        "ref": "124060",
        "platform": "watchbox",
        "title": "Rolex Submariner No Date 124060",
        "price_usd": 10050,
        "dealer": "1916 Company (ex-WatchBox)",
        "listing_url": "https://www.the1916company.com/.../124060-..."
    },
    "detected_at": "2026-05-06T00:46:42.000Z"
}
```

This was a real cross-platform spread: WatchBox listed a Submariner 124060 at $10,050 while the median across Chrono24 + Bobs + WatchBox was $13,988 — a 28.2% spread, ~$3,900 below market in plain dollars.

### Telegram alert format (real screenshots from a live run)

This is what actually arrived in our test Telegram chat from the build 0.1.19 run on 2026-05-06 — three real arbitrage opportunities on a Rolex Submariner Kermit (`126610LV`):

![Real Telegram alerts — 3 spreads detected on Rolex 126610LV](https://raw.githubusercontent.com/DataKazKN/watch-arbitrage-mcp/main/actor/assets/screenshots/08-telegram-alerts-real.png)

Each alert includes:

- **Brand + sub-reference** (`Rolex — 126610LV`)
- **Asking price** + the platform name (`$11,900 on Chrono24` — clean platform labels, not raw enums)
- **Cross-platform median** computed across every source that returned listings
- **Spread** in both dollars and % below median
- **Year** + dealer fields when scraped reliably
- **Asking price disclaimer** — listed price excl. shipping, taxes, customs (varies by buyer location)
- **Direct link** to the listing on the source platform

> The asking-price disclaimer is important: dealer-listed price ≠ delivered price. Add ~10-20% for shipping + import duty + sales tax depending on your buyer's geography. The alert reflects the _asking price the dealer typed on their listing page_ — that's the price you negotiate from.

Note: arbitrage stats are computed per **sub-reference** (e.g. `5711/1A-010` vs `7011/1G` are tracked as separate sub-models even when both come from a `Nautilus` search). This eliminates false positives where a ladies' Nautilus would flag as a "spread" against the men's median.

## Data table — fields per listing

| Field                  | Description                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ref`                  | Reference number you queried                                                                                        |
| `brand`                | Auto-detected: `patek-philippe` / `rolex` / `audemars-piguet`                                                       |
| `platform`             | `chrono24` / `watchbox` / `bobs` / `watchfinder` / `europeanwatch` / `watchesofswitzerland`                         |
| `title`                | Listing title from the source page                                                                                  |
| `price_usd`            | Normalized to USD via static FX (EUR/GBP/CHF/etc.)                                                                  |
| `price_orig`           | Raw price as listed                                                                                                 |
| `currency`             | Original currency                                                                                                   |
| `condition`            | Raw condition string from source page (e.g. `"Very good"`, `"Pre-owned"`)                                           |
| `condition_normalized` | Normalized to `new` / `like-new` / `very-good` / `good` / `fair` / `vintage` / `pre-owned` / `unknown`              |
| `box_papers`           | Detected box & papers status: `full-set` / `box-and-papers` / `papers-only` / `box-only` / `watch-only` / `unknown` |
| `dealer`               | Dealer / seller name                                                                                                |
| `year`                 | Manufacture year if available                                                                                       |
| `location`             | Country code if available                                                                                           |
| `listing_url`          | Direct link to the listing                                                                                          |
| `scraped_at`           | ISO timestamp                                                                                                       |

## Pricing

Pay-Per-Event — you only pay for what the Actor actually does. See current pricing on the **Apify Store page** (live rates and plan-based discounts shown there).

Current live chargeable events:

| Event                        |                                        Live price | When                                                                                       |
| ---------------------------- | ------------------------------------------------: | ------------------------------------------------------------------------------------------ |
| `actor-start`                |                                          $0.00005 | Once per run                                                                               |
| `reference-monitored`        | $0.05 Free/Bronze; $0.0045 Silver; $0.00375 Gold+ | Per reference monitored in the run                                                         |
| `apify-default-dataset-item` |                                            $0.001 | Per listing written to the dataset                                                         |
| `spread-alert-triggered`     |      $2.00 Free/Bronze; $1.80 Silver; $1.50 Gold+ | **Primary value event** — only when a real arbitrage opportunity is dispatched to Telegram |

The Silver/Gold+ discount on `reference-monitored` is intentionally shown here because it materially changes run economics. For larger dataset-only runs, listing charges may not cover Camoufox/proxy compute after Apify's 20% platform margin.

**Economics preflight**: before crawling, the Actor estimates references x marketplaces, expected dataset rows, proxy risk, live plan pricing, Apify margin, and `ACTOR_MAX_TOTAL_CHARGE_USD`. If the expected net revenue does not cover the likely platform cost, the run stops before scraping and writes an `ECONOMICS_GUARD` key-value record explaining why.

### Avoid surprise charges / Run budget

- Start with 1-3 precise references, the default 6 production marketplaces, and `max_listings_per_ref_per_platform: 10`.
- Use `alert_channel: "telegram"`, `"email"`, or `"both"` with valid alert credentials if you want the value event. `dataset_only` is useful for inspection, but larger dataset-only runs can be stopped by the economics guard.
- Set a per-run spending limit in Apify Console. If `ACTOR_MAX_TOTAL_CHARGE_USD` is lower than the break-even gross required for the selected scope, the Actor stops before crawl.
- Narrow `platforms` before raising listing caps. Chrono24, WatchBox/The 1916 Company, Bobs, Watchfinder, European Watch, and Watches of Switzerland are the default production set.
- Avoid residential proxy groups unless you need them. The guard treats residential proxy runs as materially more expensive.

Example gross before Apify margin:

| Scope                                                                  |                                                    Expected gross |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------: |
| 1 reference, default 6 marketplaces, ~30 dataset rows, no spread alert | about $0.034 Gold+; about $0.035 Silver; about $0.080 Free/Bronze |
| 3 references, default 6 marketplaces, one paid spread alert            |    about $1.60 Gold+; about $1.90 Silver; about $2.24 Free/Bronze |
| 6 references, default 6 marketplaces, dataset-only, ~170 rows          |    about $0.19 Gold+; about $0.20 Silver; about $0.47 Free/Bronze |

That last shape is the one to avoid: after Apify's 20% margin, about $0.20 gross can become roughly $0.16 net before compute, which is not enough for a ~$0.16 platform-cost run.

## How spread detection actually works (read this once)

A common question: _"Why do most of my alerts come from Chrono24, with only occasional ones from WatchBox / Bobs / Watchfinder?"_

That's the **mathematically expected** behavior — and it's actually the value of cross-platform median:

1. **Cross-platform median = the consensus price.** The actor computes the median price for each sub-ref across every source that returned listings (e.g. Chrono24 + WatchBox + Bobs for `124060`).
2. **Outlier listings below median = arbitrage opportunities.** A spread alert fires when ANY individual listing on ANY platform sits more than `X%` (default 5%) below that consensus.
3. **Where do outliers come from?** Mostly from **Chrono24** because:
    - Chrono24 has the **highest listing volume** per ref (typically 8-12 listings vs 1-2 on dealer sites)
    - **More listings = more variance** → statistically more outliers below median
    - Independent dealers on Chrono24 have **wider pricing dispersion** than US/UK retail dealers (who maintain stable floor prices to protect their own margin)
4. **WatchBox + Bobs + Watchfinder mostly anchor the median.** Their inventory is small but their pricing is **stable and trustworthy** — they're the floor that defines what the watch is _really_ worth. They occasionally trigger their own alerts when they get aggressive on a single piece (e.g. the 124060 example above: WatchBox at $10,050 vs the $13,988 cross-platform median).

**Practical takeaway**: monitor 15-30 refs (not 3-5) to catch the 1-2 weekly cross-platform spreads on US/UK dealer sites. Chrono24 will dominate alert volume by design — that's where the inefficiency is. The dealer-site signals are rarer but typically larger when they fire.

## Tips

- **Use precise references for accurate alerts**: `5711/1A-010` beats `Nautilus`. Sub-models (5711 vs 7011 vs 5990) are tracked separately so a ladies' Nautilus never pollutes the men's median.
- **Strict condition filtering**: pair `strict_condition_matching: true` with `platforms: [bobs, watchfinder, europeanwatch]` (the 3 sources that scrape condition reliably) for clean "new only" arbitrage.
- **Anti-bot**: Chrono24 and Bobs Watches sit behind Cloudflare. The Actor uses Camoufox + rotating Apify proxy by default — no config needed.
- **Watchfinder UK** uses canonical brand+series pages instead of free-text search (which returns no-results for raw refs). The url builder maps known refs to the right grid.
- **European Watch Co** lacks reliable site search — the Actor hits the brand grid (`/brand/rolex` etc.) and filters cards by ref-digit substring.
- **Watches of Switzerland** hides Patek pricing as "price on request"; those listings are skipped. Rolex/AP listings show full pricing.
- **Hodinkee Shop is deprecated** as of 2026-05-04 (acquired by Watches of Switzerland Group, inventory winding down). It's removed from the default `platforms` array but still accepted in the enum for backward-compat scheduled runs.
- **EU/US arbitrage**: prices on EU listings are not auto-adjusted in the dataset (you see the raw EUR→USD conversion), but the alert text flags location so you can apply your own landed-cost math.
- **Schedule it**: the Actor is designed for hourly cron. Use Apify Schedules → "Run every hour".
- **Telegram setup**: `@BotFather` → `/newbot` → token. Add bot to your dealer group → `@userinfobot` in the group → copy chat ID.

## What's new (build 0.1.19 — 2026-05-06)

- **Cross-platform median delivering** ✅: build 0.1.18 cloud test confirmed real cross-platform spreads detected on `124060` (Chrono24 + WatchBox + Bobs aggregated) and `116500LN` (Chrono24 + WatchBox aggregated). Top spread example: WatchBox 124060 at $10,050 vs $13,988 cross-platform median = 28.2% below market.
- **WatchBox / The 1916 Company URL pattern fix**: previous URL routed to a brand-suggest splash page (0 tiles); switched to `/search/?q=REF` which returns the real product grid.
- **Bobs Watches search endpoint fix**: switched from stale `/{brand}-{model}-{page}.html` catalog URLs to `/shop?query=REF` (the actual search endpoint exposed by their homepage form). Cloudflare interstitial timeout extended to 45s.
- **Ref filter regression fix**: brand-grid platforms (European Watch Co, Watchfinder, WoS) now match BASE prefix (`5711/1A`) instead of full sub-variant (`5711/1A-010`) so legitimate cards aren't stripped. Aggregator's `extractSubRef` then groups detected sub-variants for accurate median.
- **Honest pricing in alerts**: every Telegram message now includes `_Asking price excl. shipping, taxes, customs (varies by buyer location)._` to match what the user sees if they click through to the dealer page.
- **Platform names in Telegram**: alerts now show `WatchBox / The 1916 Company` (not the raw `watchbox` enum). Same for every monitored source.
- **Email alerts restored**: `alert_channel` now supports `email` and `both` when the Actor runs with `FULL_PERMISSIONS`. Email uses Apify's `apify/send-mail` Actor and sends one digest per run.
- **Honest dispatcher reporting**: `email_sent` only reports `true` after the email digest is sent successfully.

## Earlier — build 0.1.17 (2026-05-05)

- **5 critical accuracy bugs fixed**: strict ref-matching per platform, trimmed median (drops outlier listings), 30% min price floor (skip wrong-watch matches), model-name title matching, and **sub-reference grouping** (the big one — distinct sub-models get distinct medians).
- **Spending limit respect**: every charge call now honors `ACTOR_MAX_TOTAL_CHARGE_USD`.
- **Filter by condition + box & papers** with optional strict mode.
- **MCP server (Apify Standby)** for Claude Desktop / Cursor / ChatGPT — see section below.

## FAQ

**Is scraping these sites legal?**
The Actor only reads publicly-listed prices (no login, no PII). All listings are pages already indexed by Google. Always confirm compliance with each platform's ToS for your specific use case.

**Why only Patek/Rolex/AP?**
These are the three brands with deep dealer arbitrage — high enough listing volume across multiple platforms to get a meaningful median. We may add Vacheron / Lange / Richard Mille based on demand.

**What if a platform changes its DOM?**
Each crawler degrades gracefully — a broken selector logs a warning and the run continues with partial data from the other selected platforms.

**Can I add more platforms?**
Open an issue and tag your dealer use case. Adding an additional platform is ~30 min of crawler work using the existing template structure.

**Disclaimer**
Prices are estimates. Always verify the listing manually before any transaction. The Actor is a research tool, not a trading bot — final buy/sell decisions are yours.

## Source notes (history & dealer recognition)

If you're new to the secondary luxury watch market, here's the dealer landscape this Actor monitors:

- **Chrono24** — the dominant global marketplace (Karlsruhe, Germany; founded 2003). 500K+ active listings; the de-facto reference price for any Patek/Rolex/AP because of pure listing volume. Independent dealers worldwide list here; widest pricing dispersion = where most arbitrage signals come from.
- **WatchBox / The 1916 Company** — premium US dealer, originally **WatchBox** (Pennsylvania, founded 2017 by ex-Govberg leadership). In 2024, WatchBox merged with **Govberg Jewelers** (Philadelphia, est. 1916) and **Hyde Park Jewelers** (Denver) to form **The 1916 Company** — the name nods to Govberg's 1916 founding date. The watchbox.com domain redirects to `the1916company.com` since Feb 2025. Dealers still call it "WatchBox" colloquially. Inventory blends ex-WatchBox + ex-Govberg + ex-Hyde Park stock plus new acquisitions. Strong Patek + Rolex; expanding AP.
- **Bobs Watches** — Newport Beach CA, est. 1999, Rolex specialist (some Omega/Tudor). Known for transparent buy/sell pricing and long-tenured CEO Paul Altieri. Cloudflare-protected; we use Camoufox + Apify proxy rotation to scrape reliably.
- **Watchfinder UK** — UK leader (Maidstone, est. 2002). Acquired by **Richemont Group** in 2018. The cleanest box-and-papers metadata of any source we monitor. Free-text search returns no-results for raw refs, so the Actor maps each ref to its canonical brand+series page.
- **European Watch Co (EWC)** — Boston-based independent dealer, est. 2010. Strong Patek inventory (69+ pieces verified 2026-05). Site search is unreliable so we hit the brand grid directly and filter cards by base ref prefix.
- **Watches of Switzerland Group (WoS)** — UK + US retail chain group, includes **Mayors** (US), **Mappin & Webb** (UK), **Goldsmiths** (UK), and the WoS-branded boutiques. Patek pricing displayed as "price on request" and is therefore skipped; Rolex/AP work when in stock.
- **Hodinkee Shop** — formerly an independent editorial+commerce site (NYC). Acquired by Watches of Switzerland Group in 2024; commerce side wound down through 2026. **Removed from default platforms** list 2026-05-04 but kept in the enum so any pre-existing scheduled runs don't break.

Why these 13? They span the global pre-owned dealer flow that Chrono24-only Chrome-extension tools miss. **6 are loud-five US/UK majors** (Chrono24, WatchBox, Bob's, Watchfinder, European Watch, Watches of Switzerland) and **7 are blind-spot specialists** the typical $20/mo Chrome extension never scrapes — UK pre-owned (Watch Club, A Collected Man), DE pre-owned (Spliedt, Bachmann & Scher), US vintage (Analog:Shift), JP auctions (Yahoo Japan with JP-proxied route). That's where the wider cross-country spreads hide.

## Use as MCP server (Claude Desktop / Cursor / ChatGPT)

In addition to the batch crawler (above), this Actor doubles as a **Model Context Protocol server** in Apify Standby mode. Connect your AI agent and it can query your live arbitrage feed in plain language: _"Show me the biggest Daytona spreads right now"_, _"What's the median price of a 5711/1A this week?"_

Three tools are exposed over both REST and MCP JSON-RPC:

| Tool                     | Purpose                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- |
| `get_arbitrage_snapshot` | Top N current arbitrage opportunities, optionally filtered by ref + min spread % |
| `get_market_stats`       | Per-ref median, min, max, count across platforms                                 |
| `get_listings_by_ref`    | Raw listings for a ref, filterable by condition + box/papers, paginated          |

**Data freshness**: results reflect the most recent batch run (you should schedule the batch crawler to run hourly or however often you need fresh data). If the cache is older than 60 minutes, the server returns 503 with Retry-After.

### Claude Desktop config

Add to `claude_desktop_config.json`:

```json
{
    "mcpServers": {
        "watch-arbitrage": {
            "url": "https://kazkn--watch-arbitrage-mcp.apify.actor/mcp?token=apify_api_YOUR_TOKEN_HERE",
            "transport": "streamable-http"
        }
    }
}
```

Replace `apify_api_YOUR_TOKEN_HERE` with your token from [console.apify.com/account/integrations](https://console.apify.com/account/integrations).

### Cursor / Windsurf

Same URL — add it under the MCP section of your IDE settings, transport `streamable-http`.

### Plain HTTP (curl / your backend)

```bash
# Top 10 spreads
curl -X POST https://kazkn--watch-arbitrage-mcp.apify.actor/mcp/arbitrage \
  -H "Authorization: Bearer apify_api_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"min_spread_pct": 5, "limit": 10}'

# Market stats for two refs
curl -X POST https://kazkn--watch-arbitrage-mcp.apify.actor/mcp/market-stats \
  -H "Authorization: Bearer apify_api_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"references": ["5711/1A", "116500LN"]}'

# Listings: full-set 5711/1A only, first 10
curl -X POST https://kazkn--watch-arbitrage-mcp.apify.actor/mcp/listings \
  -H "Authorization: Bearer apify_api_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ref": "5711/1A", "box_papers": ["full-set"], "limit": 10}'
```

### MCP query pricing

MCP queries use the same Pay-Per-Event meter as the batch crawler:

- `get_arbitrage_snapshot` → $1.50-$2.00 per call (`spread-alert-triggered`) — you only pay when you ask for the value-extracting view
- `get_market_stats` → free read (no event charge)
- `get_listings_by_ref` → $0.001 per listing returned (`apify-default-dataset-item`)

## Support

- **Issues / feature requests**: open a [GitHub Issue](https://github.com/DataKazKN/watch-arbitrage-mcp/issues)
- **Source code**: [github.com/DataKazKN/watch-arbitrage-mcp](https://github.com/DataKazKN/watch-arbitrage-mcp) (MIT-licensed; PRs welcome)
- **Custom dealer integrations** (private feeds, SMS alerts, additional brands): contact via Apify message on the Actor's Store page

## More KazKN Actors

Watch Arbitrage Tracker is part of the [KazKN portfolio](https://apify.com/kazkn) — Apify Actors built by professional dealers, for professional dealers. If cross-marketplace price intelligence is the play, you'll probably also want:

- **[Vinted Smart Scraper](https://apify.com/kazkn/vinted-smart-scraper?fpr=8fp2od)** — cross-country price comparison across 19 European Vinted marketplaces. 105K+ runs, 369+ users, ⭐5 average across 3 reviews. Same arbitrage philosophy: surface the spread other tools miss.
- **[Vinted Turbo Scraper](https://apify.com/kazkn/vinted-turbo-scraper?fpr=8fp2od)** — high-throughput Vinted fetcher for volume operators (resellers, marketplace aggregators).
- **[Vinted MCP Server](https://apify.com/kazkn/vinted-mcp-server?fpr=8fp2od)** — Vinted Smart Scraper exposed as a Model Context Protocol server. Talk to your Vinted inventory in Claude Desktop / Cursor / ChatGPT.
- **[Commercial Real Estate Brokerage Intel](https://apify.com/kazkn/commercial-real-estate-brokerage-intel?fpr=8fp2od)** — LoopNet + Crexi listing tracker. Same cross-source median pattern, applied to CRE.
- **[GPT Crawler MCP](https://apify.com/kazkn/gpt-crawler-mcp?fpr=8fp2od)** — turn any website into a knowledge file for ChatGPT, Claude, or RAG pipelines.

Live dashboard with portfolio-wide stats: [kazkn-dashboard.fly.dev](https://kazkn-dashboard.fly.dev).

---

▶ **[Try Watch Arbitrage free on Apify](https://apify.com/kazkn/watch-arbitrage-mcp?fpr=8fp2od)** — start monitoring your first 1-3 precise references. Real cross-platform spreads land in your Telegram within the hour. $1.50-$2.00 when a spread alert fires. No monthly minimum.
