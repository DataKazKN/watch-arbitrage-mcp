# I tracked the Patek 5711/1A across 13 dealer marketplaces for 30 days. The JP↔US spread holds at $44,300.

For the last 30 days I've been running an hourly scrape of the Patek Philippe 5711/1A-010 across 13 dealer marketplaces. Same reference, same condition class (full-set 2020-2022), no aftermarket modifications. This article is the cross-platform median data — what I found, why it holds, and how I'd think about sourcing if I were trading the gap.

The headline finding: the Japan-listed median sits at **$148,200**, the US-listed median at **$192,500**. Same week, same reference, same condition class. That's a **$44,300 spread** that has held within ±$3,000 for four consecutive weeks of measurement.

If you're a pro dealer who already knows this gap exists, the data below quantifies it. If you only track 4-5 US/UK majors (the loud-five Chrome-extension targets), this is what you're missing.

## The 13 marketplaces I track

| # | Marketplace | Country | Sample size (Patek 5711) | Notes |
|---|---|---|---|---|
| 1 | Chrono24 | EU (sellers TR/DE/IT) | 124 listings | Largest single-source sample, widest condition variance |
| 2 | WatchBox / The 1916 Company | US | 18 | Premium dealer, low listing flux |
| 3 | Bob's Watches | US | 7 | Rolex-heavy specialist, Patek is rare here |
| 4 | Watchfinder UK | UK | 12 | Richemont-group; mostly full-set |
| 5 | European Watch Co (Boston) | US | 11 | Strong Patek inventory, high-end pricing |
| 6 | Watches of Switzerland (en-int) | UK | 4 | Patek pricing often "price on request" |
| 7 | Hodinkee Shop | US | 0 (dormant) | Winding down post-WoS-Group acquisition |
| 8 | The Watch Club (London + HK) | UK | 6 | Strong cross-Pacific dealer flow |
| 9 | H. Spliedt (Munich/Hamburg/Sylt) | DE | 5 | EUR pricing, premium pre-owned |
| 10 | A Collected Man (London) | UK | 9 (live) + 213 archive | Heavy archive — mostly Sold cards |
| 11 | Analog:Shift (NYC) | US | 8 | Vintage + neo-vintage specialist |
| 12 | Bachmann & Scher (Munich) | DE | 3 | Small dealer, high-touch inventory |
| 13 | Yahoo Auctions Japan | JP | ~40 | Bilingual JP/EN listings, Buy-It-Now (即決) filter |

Total live inventory observed in the 30-day window: ~257 listings of the 5711/1A-010.

## Per-country median (P50, trimmed)

I use a 10% winsorized median per country to drop the noisy edges (Chrono24 Turkish-seller undercuts, Hodinkee retail premiums). All values in USD:

| Country | Median (P50, USD) | P10 | P90 | Sample size |
|---|---|---|---|---|
| 🇯🇵 Japan (Yahoo Auctions) | **$148,200** | $138,000 | $159,000 | ~40 |
| 🇪🇺 EU (Chrono24 weighted by listing country, EUR→USD) | **$174,800** | $158,400 | $191,200 | 124 |
| 🇩🇪 Germany (Spliedt + Bachmann & Scher, EUR→USD) | **$179,200** | $171,500 | $186,800 | 8 |
| 🇬🇧 UK (Watchfinder + WoS + Watch Club + A Collected Man, GBP→USD) | **$186,400** | $174,000 | $198,300 | 31 |
| 🇺🇸 USA (WatchBox + Bob's + European Watch Co + Analog:Shift) | **$192,500** | $186,000 | $201,000 | 44 |

The **JP→US gap = $44,300 = 22.7%** on the same reference + condition class.

Even after the realistic round-trip costs from Tokyo to a US dealer:
- 8-10% papers-only haircut (most Yahoo listings are pre-owned, ~$15k)
- JPY-USD FX volatility ~2-3%
- Customs + Brokerage + Insurance + Shipping ~$800-1,200
- US dealer 5% margin

…you still net **~$25-30k** on the same watch. That's not arbitrage in the textbook sense (the gap is friction-priced, not free-money), but it's the entire trade for any dealer with the operational infrastructure to source in JP.

## Why the gap persists

Three reasons that came out of the data:

**1. The Japanese listings often come from estate sales.** Owners want yen-cash now. The Chrono24 secondary market is not in their consideration set. They list at "fair Tokyo market" prices which historically lag the global secondary market by 6-9 months.

**2. The 7 specialist platforms aren't on most arbitrage radars.** Most cross-platform watch tracking tools (Watchcharts, Bezel, Chrono24 Pro itself) focus on the **loud-five US/UK majors** (Chrono24, WatchBox, Bob's, Watchfinder, European Watch Co). The 7 specialists I added — UK pre-owned (Watch Club, A Collected Man), DE pre-owned (Spliedt, Bachmann & Scher), NYC vintage (Analog:Shift), and Tokyo auctions (Yahoo JP) — are where the wider cross-country spreads hide.

**3. The friction is real, but lower than you'd think.** Yahoo JP rate-limits aggressively from non-JP IPs. That stops most casual buyers. But operationally — wire transfer to JP seller via Yodogawa-Bashi or similar, Japan Post EMS shipping with Bordereau Customs Declaration — is a known playbook for the dozen-or-so professional dealers who do this routinely.

## What about other refs?

Same scrape covers the Rolex Daytona 116500LN (white dial) and the AP Royal Oak 15500ST. Tighter sample sizes, but the pattern is qualitatively similar:

**Daytona 116500LN (sample n=89 cross-platform, 30 days):**
- Cross-platform median: $29,646
- P10: $28,500 (Chrono24, TR-located, papers-only)
- P90: $34,500 (European Watch Co, full-set + 2yr warranty)
- 17% spread between extremes, mostly explained by papers/warranty/dealer-stamp premium — less cross-country effect than Patek

**Royal Oak 15500ST (sample n=27, 30 days):**
- Cross-platform median: $52,400
- P10-P90: $48,200 - $57,100
- ~8% spread — tightest of the three because AP supply is thinner, dealers price more aggressively against each other

## How I built it (one paragraph)

The scraper is a TypeScript + Crawlee + Playwright stack running on Apify's serverless infrastructure. Each marketplace has a hand-tuned crawler (the per-DOM normalization is where 95% of the work is — Bob's marks "papers only" as a checkbox, Spliedt as German text in the description, Yahoo JP as 即決-flag + Japanese kanji). Cloudflare-protected sites (Chrono24, Bob's) need Camoufox + residential proxy rotation. Yahoo JP needs JP-routed proxy to bypass the EEA/UK geo-block. End-to-end cycle (scrape 13 platforms + aggregate + emit alerts): 3-4 seconds per reference.

Output schemas: per-ref median + P10/P90 + platforms covered; arbitrage opportunities (listings ≥ X% below cross-platform median); cross-country spreads (every country-pair gap). Alerts dispatch via Telegram. Median computation uses a 10% trimmed mean to drop seller-undercut outliers.

## Edge cases I learned the hard way

- **Yahoo JP refuses EEA/UK IPs since 2022-04-06** (LINEヤフー regulatory notice). The actor needs `apifyProxyCountry: 'JP'` — set it once or accept zero JP coverage.
- **Chrono24 EU sellers are noisy**: Turkish sellers routinely undercut by 5-10% but with mixed paper histories. My 10% winsorized median drops these.
- **Hodinkee Shop is dormant** post-Watches-of-Switzerland-Group acquisition. Kept in the enum for completeness; expect 0 inventory.
- **A Collected Man inventory is ~96% archive** — they're a premium pre-owned + horology archive, most cards are Sold. The crawler filters these.
- **Bachmann & Scher TYPO3 URLs require a `cHash` parameter** that's session-bound — I scrape the unfiltered catalog and filter client-side by brand keyword.

## What I'd want to see next

If you trade these references and have access to the actual filled-price data (not just listing prices), I'd love to see whether the **realized** JP→US gap closes faster than the listed gap. My intuition is that listing inflation on the US side has a 4-6 week half-life and the "true" gap is closer to $35k than $44k once you settle for what dealers actually pay.

Comments welcome — particularly from anyone who's traded this gap in 2025-2026 and can ground-truth the numbers.

---

*Disclosure: I built the actor that produced this data. It is open-source (MIT) on GitHub and runs on the Apify platform. If you want to reproduce the methodology, the source is at github.com/DataKazKN/watch-arbitrage-mcp.*
