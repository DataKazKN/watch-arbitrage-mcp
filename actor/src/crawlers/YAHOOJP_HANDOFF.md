# Yahoo Japan crawler — operator handoff for DOM verification

**Status (2026-05-18):** yahoojp crawler is wired and dispatches at runtime, but
DOM selectors in `yahoojp.ts` are best-effort and not yet verified against live
JP-proxied HTML. Yahoo Japan geo-blocks EEA/UK traffic (LINEヤフー regulatory
notice, 2022-04-06) which makes verification from this dev machine impossible.

## What the operator needs to do (one-time, ~10 min)

Two equivalent options. Pick whichever is cheaper for you.

### Option A — Apify residential proxy (recommended, no manual capture)

Run the actor once with a JP-routed proxy:

```json
{
  "references": ["5711/1A-010"],
  "platforms": ["yahoojp"],
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "JP"
  },
  "max_listings_per_ref_per_platform": 5,
  "alert_channel": "dataset_only"
}
```

Then download the actor's KV `INPUT.html` and run dataset items — if listings
came back with non-empty `title` + `price_orig`, the selectors held. If
`title` is empty or `parsePrice` returned null, save a fresh HTML capture
(below) and send it to dev.

Residential JP proxy on Apify costs ~$0.50/GB; one verification run is <50 MB.

### Option B — Manual HTML capture (free)

From a JP-located browser (Tokyo VPN, or a friend in Japan):

1. Open https://auctions.yahoo.co.jp/jp/search/keyword/patek%20philippe%205711?p=patek%20philippe%205711
2. Wait for results to render (3-5 sec; SPA layout)
3. Save the rendered DOM as HTML:
   - Chrome devtools → Elements panel → right-click `<html>` → "Copy outerHTML"
   - Paste into a file named `yahoojp-search-5711.html`
4. Drop the file into `actor/test/fixtures/` and ping dev to run selector verification

A single capture covers all references — the DOM structure is per-keyword-page
not per-reference.

## What dev does with the capture

1. Parse the HTML in `test/yahoojp.dom.test.ts` (already scaffolded — TBD next session)
2. Verify `CARD_SELECTOR`, `SEL_PRICE_BIN`, `SEL_PRICE_AUCTION`, `SEL_TITLE`
   against real markup
3. Add a 即決 (Buy-It-Now) filter so auction-only listings drop out of median
4. Fix `fx.ts` JP edge cases if any new patterns surface (full-width ¥, 万 multiplier
   are already handled as of commit 8b3f9a8)
5. Promote yahoojp from `(beta)` to `(verified)` in the input schema
   enumTitles
6. Ship as v0.2

## Why we can't shortcut this

Yahoo's anti-scrape rotates DOM class names every few months — verifying once
without ongoing capture means the crawler will silently degrade. The right
play is: get capture once now, set up a quarterly recapture cadence after the
first commercial run revenue arrives.
