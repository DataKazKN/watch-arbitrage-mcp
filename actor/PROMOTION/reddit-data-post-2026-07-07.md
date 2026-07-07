# Reddit Data Post — Watch Arbitrage Proof — 2026-07-07

## Target

Primary: `r/Watches`

Do **not** post this as a product launch. Post it as a data/methodology discussion.

## Title

```text
I compared Rolex asking prices across dealer sources — one 124060 listing was 31% below the mini-sample median
```

## Body

```text
I’ve been digging into watch pricing data because one thing keeps bothering me:

A single marketplace asking price is useful, but it is a dangerous comp.

A “cheap” Rolex/Patek/AP listing can be cheap because it is genuinely under market.

Or it can be cheap because:

- condition is doing a lot of work
- box/papers are unclear
- seller/dealer trust differs
- geography/import costs change the landed price
- the ask is stale
- the listing is just a weird outlier

So instead of treating one marketplace as “the market”, I ran a small cross-source dealer snapshot.

This is intentionally a tiny proof run, not a giant dataset:

Refs checked:

- Rolex Submariner 124060
- Rolex Daytona 116500LN
- Patek 5711/1A-010

Sources checked:

- Bob’s Watches
- WatchBox / The 1916 Company
- Watchfinder
- European Watch

Result:

- 11 requests succeeded
- 5 listings collected
- 2 refs returned usable normalized data
- 1 under-median candidate was detected

For 116500LN:

- Bob’s: $32,495
- WatchBox / 1916: $31,950
- mini-sample median: $32,222

For 124060:

- Bob’s: $14,795
- Bob’s: $14,595
- WatchBox / 1916: $10,050
- mini-sample median: $14,595

That WatchBox / 1916 124060 listing is ~31% below this tiny sample’s median.

Important caveat: I am **not** saying “this is free money”.

This is asking-price data, not sold-price data. You still need to check seller/dealer trust, condition, box/papers, tax, shipping, FX, stale listings, etc.

But this is exactly why I think single-source comps are risky. The useful question is not “is this listing cheap?”

The useful question is:

“How does this listing compare against other dealer-source asks for the same ref, and what extra due diligence does the gap trigger?”

Curious how people here sanity-check prices today:

Do you trust Chrono24 asking prices, dealer listings, WatchCharts, auction comps, private sales, or something else?
```

## First comment if discussion is positive

```text
Small disclosure: I built an Apify actor to run these snapshots because doing it manually across sources is annoying.

Not trying to spam the link. If anyone wants, reply with a reference and I’ll run a public snapshot / CSV so we can look at the data first.
```

## If someone asks for the tool

```text
It’s called Watch Arbitrage Tracker on Apify. The useful part is not “guaranteed arbitrage”; it’s getting a normalized cross-source sanity check before treating one listing as market truth.

Happy to run a ref first so you can judge the output before caring about the tool.
```

## If someone says asking price is not sold price

```text
100% agree. That’s actually the point of the post.

This is not a valuation oracle. It’s a first-pass radar that says “this listing is materially below/above other public dealer asks, now go inspect condition, papers, seller, fees, and sale comps.”
```

## If someone says the sample is too small

```text
Agreed — tiny sample by design. I wanted to share a transparent proof run rather than pretend this is a statistically complete market study.

The next useful version is more refs + more sources + sold/auction comps where available.
```

## If someone attacks scraping/tools

```text
Fair. I’m only using public listing data as a pricing sanity check, not seller verification or investment advice. The output should trigger human due diligence, not replace it.
```

## Links to proof files

Internal proof artifact:

- `/Users/kinderbb/workspace/apify-ops/research/watch-arbitrage-boost-2026-07-07/watch-proof-artifact-2026-07-07.md`
- `/Users/kinderbb/workspace/apify-ops/research/watch-arbitrage-boost-2026-07-07/watch-proof-run-2026-07-07.items.csv`

Desktop copies:

- `/Users/kinderbb/Desktop/WATCH_ARBITRAGE_PROOF_ARTIFACT.md`
- `/Users/kinderbb/Desktop/WATCH_ARBITRAGE_PROOF_ITEMS.csv`
