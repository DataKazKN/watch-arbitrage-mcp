# Building an Apify actor that scrapes 13 dealer DOMs — Cloudflare bypassing, JPY math, and the cross-platform median

I shipped a watch arbitrage tracker on Apify Store last month. This is the technical writeup — what it took to wire 13 dealer marketplaces into a single normalized data stream, the edge cases I hit, and the architecture choices I'd make again (and the ones I'd change).

If you're building any kind of cross-marketplace scraper for an Apify actor, this article should save you 20-30 hours of trial-and-error.

## The problem in one line

> Scrape 13 luxury watch dealer marketplaces hourly, normalize per-listing data into a single schema, compute trimmed cross-platform medians per reference, fire Telegram alerts when listings sit X% below the median.

The hard parts are not the scraping. They are the *normalization* (each dealer marks "papers only" differently — German text, JSON enum, presence/absence of a `box-papers-images` div), the *trimming* (Turkish Chrono24 sellers undercut by 5-10% with mixed papers, you have to drop them), and the *cross-country pricing* (Yahoo JP lists in JPY with 万 multipliers, A Collected Man in GBP, Spliedt in EUR with German thousand-dots).

## The stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | Apify-native, type-safe per-platform normalization |
| Crawler | Crawlee + Playwright (Firefox via Camoufox) | Cloudflare-protected sites need stealth |
| Hosting | Apify Standard Actor | Serverless billing, built-in proxy, Standby/MCP mode |
| Proxy | Apify Residential | Required for Yahoo JP (geo-block since 2022) |
| Aggregation | Custom `aggregator.ts` | Cross-source median + condition normalization |
| Alerts | Telegram Bot API | Where pro dealers actually read messages |
| Tests | Vitest, 43 unit tests | Pure logic, no network |
| MCP | Apify Standby + custom MCP JSON-RPC | Optional second mode for AI agent queries |

## The architecture

```
                    +-----------------+
                    |  ActorInput     |
                    |  (refs, etc.)   |
                    +--------+--------+
                             |
                             v
                    +-----------------+
                    | URL builder     |  ← per-platform routing
                    | (utils/url.ts)  |
                    +--------+--------+
                             |
                             v
                    +-----------------+
                    | PlaywrightCrawler  ← Crawlee + Camoufox
                    | (router by      |    Cloudflare bypass
                    |  platform)      |    Residential proxy
                    +--------+--------+
                             |
                             v
              +--------------+----------------+
              | 13 platform handlers          |
              | chrono24, watchbox, bobs, ... |
              +--------------+----------------+
                             |
                             v
                    +-----------------+
                    | Listing[]       |  ← annotateCountries()
                    | (normalized)    |
                    +--------+--------+
                             |
                             v
                    +-----------------+
                    | Aggregator      |  ← trimmed-median P50 + P10/P90
                    | (cross-source)  |
                    +--------+--------+
                             |
                             v
                    +-----------------+
                    | Output: KV + DS |  ← MARKET_SNAPSHOT, OPPORTUNITIES,
                    |                 |    CROSS_COUNTRY_SPREADS
                    +--------+--------+
                             |
                             v
                    +-----------------+
                    | Telegram alert  |
                    +-----------------+
```

## Per-platform DOM normalization (the actual work)

Each platform has its own schema. Some examples:

### Chrono24 (largest sample, noisiest data)

- Selector: `[data-watch-id]` on the product grid
- Price: `[data-price-result]` inside the card
- Currency forced via `?currencyId=USD` query param
- **Edge case**: Turkish sellers (location='TR') undercut by 5-10% with mixed paper histories. The 10% winsorized median drops them from the P50.

### Bob's Watches (Cloudflare-protected)

- Search route: `/shop?query={ref}` returns `h1=REF` and structured cards
- Selector: `.seocart_ProductWrapper`
- **Edge case**: Cloudflare blocks vanilla Playwright. Camoufox (a Firefox fork with stealth shims) handles it.

### Yahoo Auctions Japan (geo-blocked + JPY math)

- URL: `auctions.yahoo.co.jp/jp/search/keyword/{q}?p={q}`
- **Geo-block since 2022-04-06**: refuses EEA/UK IPs. Must set `apifyProxyCountry: 'JP'`.
- Price format: full-width ¥, kanji 円, and the 万 multiplier ("2,250万円" = 22,500,000 JPY).
- Buy-It-Now (即決) vs current bid: keep only 即決 listings for stable median.

### A Collected Man (London) — Shopify

- 96% of inventory is "Sold" archive. Crawler filters Sold cards aggressively.
- Selector: `.product-card` + `[class*="price"]` + `img[alt]` (alt text richer than card title)

### Bachmann & Scher (Munich) — TYPO3

- The brand-filter URLs require a `cHash` parameter bound to session state. Can't be replayed.
- **Workaround**: scrape the unfiltered catalog and filter client-side by brand keyword regex.
- Price format: "€ 108.790,-" (EU thousand-dots, dash for ",00").

### Analog:Shift (NYC vintage) — Shopify

- Internal IDs in URL slug: `-asXXXXX`. The ref number rarely appears in the title.
- Workaround: ref-matching haystack = `title + URL slug`.

## The currency math (less trivial than you'd think)

The `fx.ts` module parses prices like:
- `$192,500` → `{amount: 192500, currency: USD}`
- `€85.000,00` → `{amount: 85000, currency: EUR}` (German thousands dot)
- `€ 108.790,-` → `{amount: 108790, currency: EUR}` (German dash for ",00")
- `2,250万円` → `{amount: 22500000, currency: JPY}` (Japanese 万 multiplier × 10,000)
- `HK$ 1,950,000` → `{amount: 1950000, currency: HKD}` (HKD detection before bare $)

The bare `$` is ambiguous (USD vs CAD vs AUD vs SGD vs HKD). Order of currency detection matters: HKD first, then USD as the fallback.

Once parsed, `toUsd(amount, currency)` converts via a static rate table (refreshed quarterly). EU listings get an `EU_TO_US_IMPORT_OVERHEAD` add-on of 20% when comparing to US-only medians — VAT + import duty estimate for a US dealer landing the watch in the US.

## The 10% winsorized median (where the alpha is)

Naive median across 257 listings of the 5711/1A returns ~$185k. That's not actionable because:
1. Turkish Chrono24 listings (10% of sample) sit at $165k with mixed papers — they pull the median down artificially.
2. Hodinkee Shop legacy listings sit at $210k for full-set, but Hodinkee inventory is winding down.

The fix: **trimmed mean of the middle 80% (P10-P90 range)**. Same algorithm Watchcharts uses (per their public docs), tuned per-source weight:
- Chrono24 weighted at 0.6 (high volume, low signal)
- WatchBox / European Watch / Watchfinder weighted at 1.0 (curated dealers)
- Yahoo JP weighted at 0.7 (auction format, volatile)

Code in `aggregator.ts:computeRefStats()`:

```typescript
function trimmedMedian(listings: Listing[], trimPct = 0.1): number {
  const prices = listings.map(l => l.price_usd).sort((a, b) => a - b);
  const trim = Math.floor(prices.length * trimPct);
  const trimmed = prices.slice(trim, prices.length - trim);
  const mid = Math.floor(trimmed.length / 2);
  return trimmed.length % 2
    ? trimmed[mid]
    : (trimmed[mid - 1] + trimmed[mid]) / 2;
}
```

For 257 listings with 10% trim, drops 25 from each end → median of 207 middle prices. Gives a stable P50 that doesn't move with outlier listings.

## Cross-country spread detection (the actual product feature)

```typescript
function computeCrossCountrySpread(listings: Listing[]): CrossCountrySpread[] {
  const byCountry = groupBy(listings, l => PLATFORM_COUNTRY[l.platform]);
  const medians = mapValues(byCountry, ls => trimmedMedian(ls));

  const pairs: CrossCountrySpread[] = [];
  for (const [from, fromMedian] of Object.entries(medians)) {
    for (const [to, toMedian] of Object.entries(medians)) {
      if (from === to) continue;
      const gap = toMedian - fromMedian;
      const gapPct = gap / fromMedian;
      if (gapPct > 0.05) {  // 5% threshold
        pairs.push({ from, to, gap_usd: gap, gap_pct: gapPct * 100 });
      }
    }
  }
  return pairs.sort((a, b) => b.gap_pct - a.gap_pct);
}
```

For the 5711/1A on a recent run:
- JP → US: $148k → $192k = 22.7% spread (top result)
- JP → UK: $148k → $186k = 19.4%
- EU → US: $175k → $192k = 9.7%
- DE → US: $179k → $192k = 7.0%

We keep the top-1 widest gap per ref (to avoid Telegram spam from every country pair).

## The MCP server mode (bonus)

Apify supports a `Standby` mode where the actor runs as a persistent HTTP server. I implemented `src/server.ts` to expose three MCP JSON-RPC endpoints:

- `get_arbitrage_snapshot` — current top spreads
- `get_market_stats` — per-ref P50/P10/P90 (free read)
- `get_listings_by_ref` — raw listings for a ref

This lets you query the live dataset from Claude Desktop or Cursor:

> "What's the biggest Daytona spread right now?"
> "Show me all 5711s under $180k."

The MCP server is a JSON-RPC layer on top of the same cached batch results. No extra scraping — it answers from the most recent batch run's KV store.

## Testing strategy (where I got it right)

43 unit tests covering:
- Platform contract: enum matches input schema, URL builder produces valid URLs for every platform × ref
- Brand detection: handles ref numbers + model names + brand prefix
- Aggregator: price-ceiling routing, MIN_PRICE_FLOOR, trimmed median, cross-country pair generation
- FX: all currency edge cases (full-width JPY, German dots, HKD vs USD ambiguity)

No e2e tests — those require live HTML capture, which is fragile. Manual e2e via `apify call` covers integration.

## What I'd change (the things I got wrong)

1. **Should have started with the schema, not the URLs.** I built URL builders first, then realized 4 of 13 platforms needed runtime DOM inspection because their search routes are broken. Should have done DOM verification first, URL second.

2. **The `condition` field is too loose.** I use a free-text `condition: string` plus a parallel `condition_normalized: WatchCondition` enum. Should have been a strict enum from day 1.

3. **No retention strategy.** The actor's dataset is 30 days deep because that's Apify's default retention. For year-over-year median comparison I should snapshot weekly to a KV store with a 1-year TTL.

4. **Camoufox + Apify cold-start is slow.** First request per worker is ~30s. ~$0.01 cost overhead per run.

5. **Yahoo JP is operationally a different beast.** Geo-block + anti-scrape rotation + Japanese-language DOM. I'd consider running it as a separate actor entirely.

## How to fork this for your own niche

If you want to build an arbitrage tracker for a different vertical (cars, sneakers, single-malt whisky, vintage cameras — wherever cross-platform listings exist), the template is:

1. **Pick 5-15 dealer marketplaces** in your vertical
2. **Fork the codebase** (MIT-licensed)
3. Replace `src/crawlers/*` with handlers for your marketplaces
4. Adjust `src/types.ts` (Platform enum, PLATFORM_COUNTRY map, Brand types if any)
5. Update `src/utils/url.ts` URL builders
6. Run `apify push`
7. Submit to Apify Store

For watches specifically, the most impactful additions would be a 14th platform — recommendations welcome in comments.

---

*Disclosure: I built and maintain the actor described here. Source is MIT-licensed on GitHub at github.com/DataKazKN/watch-arbitrage-mcp. Architectural choices and edge cases are from production deploys, not theory.*
