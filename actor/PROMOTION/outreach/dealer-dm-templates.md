# Customer-discovery DMs — pro watch dealers + flippers

Targets harvested from r/Watches + r/PatekPhilippe + r/rolex + r/Flipping top-month posts. The Reddit signal is shallow (collectors mostly, not dealers), so the realer hunt is **LinkedIn search**.

## LinkedIn search strategy (highest yield)

LinkedIn has explicit "Pre-Owned Watch" dealers and "Watch Specialist" roles searchable.

**Search queries to run** (Yorick from his account):
1. `"pre-owned watches" dealer` — returns 2-5K profiles globally, filter by industry "Retail Luxury Goods & Jewelry"
2. `"Patek Philippe dealer"` — narrower, 100-300 high-intent
3. `"watch specialist" -hodinkee` — excludes editorial
4. `"watch flipping"` — small but extremely targeted
5. `"horology" "dealer"` — UK/EU dealer flavor
6. People who FOLLOW Watchcharts/Bezel/Chrono24 LinkedIn pages — direct competitor audience

Yorick filters by:
- 2nd-degree connections (warmer than 3rd+)
- US/UK/CH/DE/JP location
- Currently active on LinkedIn (last post within 30 days)

Expected: 20-30 strong prospects in 60 min of search + filtering.

## DM templates (one per persona)

### Template A — Pro dealer with public LinkedIn presence

```
Hi {first name},

Saw your post about {specific watch / market observation from their recent activity}. I work on cross-marketplace watch price data and have a 30-day median dataset that might be useful to ground-truth what you're seeing.

Quick context: I track the Patek 5711/1A across 13 dealer marketplaces (Chrono24, WatchBox, Bob's, Watchfinder, European Watch, Watches of Switzerland, Watch Club, Spliedt, A Collected Man, Analog:Shift, Bachmann & Scher, Yahoo Japan, Hodinkee). Current findings:
- JP→US median spread: $44,300 on 5711/1A-010 (22.7%)
- US→UK spread: $6,100 on the same ref
- Spread has held within ±$3,000 for 4 consecutive weeks

I'd be happy to share the full dataset — no ask attached. Just curious whether the numbers match what you see day-to-day in your trade book.

The tool I built to compute this is on Apify Store (pay-per-event pricing), but I'd love to validate the data with someone who actually trades these references.

apify.com/kazkn/watch-arbitrage-mcp

Best,
Yorick
```

### Template B — Junior dealer / new account

```
Hi {first name},

Quick question about {their recent post or activity}. I track 13 dealer marketplaces for Patek/Rolex/AP pricing and noticed {specific data point relevant to their post}.

Would you be open to a 10-minute call to compare notes on cross-platform pricing data? I'm collecting ground-truth from active dealers to validate my methodology. No pitch — just trading data.

If easier, here's the headline data: dev.to/datakaz/i-tracked-the-patek-57111a-across-13-dealer-marketplaces-for-30-days-the-jp-us-spread-holds-at-4hpa

Best,
Yorick
```

### Template C — Vintage watch specialist (Analog:Shift, A Collected Man kind of buyer)

```
Hi {first name},

Long shot here — I built a cross-marketplace scraper that tracks 13 dealer sites including Analog:Shift, A Collected Man, and The Watch Club. After 30 days of running it, the vintage Patek 5711 cross-country gap (JP→US) holds at $44,300.

The vintage segment is the most interesting because the JP estate-sale dynamic is most pronounced there. Less Instagram-driven hype, more "Japanese owner wants yen-cash" mechanics.

I'd love to learn how you think about cross-country sourcing on vintage refs specifically. Happy to share the dataset I have if it'd be useful for your pricing decisions.

apify.com/kazkn/watch-arbitrage-mcp

Best,
Yorick
```

### Template D — Apify community member (engineering audience)

```
Hi {first name},

Saw you've built {their Apify actor name} — nice work. I just shipped my Watch Arbitrage Tracker actor (kazkn/watch-arbitrage-mcp) which scrapes 13 dealer marketplaces and exposes the data as an MCP server.

The technical writeup is here if curious: dev.to/datakaz/building-an-apify-actor-that-scrapes-13-dealer-doms-cloudflare-bypassing-jpy-math-and-the-277g

Would love feedback from another Apify dev — particularly on the per-platform DOM normalization and the trimmed-median trimming logic. The code is MIT-licensed on GitHub if you want to look under the hood.

Best,
Yorick
```

## Outreach cadence

| Day | Action | Pace |
|---|---|---|
| Day 0 (today) | Search LinkedIn for 20 prospects, save handles | 30 min |
| Day 1 | Send 5 DMs (Template A) to top 5 dealer prospects | 5 min/DM |
| Day 2 | Send 5 DMs (Template A or B) to next 5 | same |
| Day 3 | Send 5 DMs (Template C) to vintage specialists | same |
| Day 4 | Send 5 DMs (Template D) to Apify devs | same |
| Day 5-7 | First-response window — engage in conversations | varies |

**Total**: 20 DMs over 4 days = ~10-20 min/day of work. Expected response rate: 30-40% (warm + personalized). Expected conversions to trial users: 5-10%.

## Tracking

Log every DM sent + response status to `state/dealer-outreach-log.jsonl`:

```json
{"date":"2026-05-20","platform":"linkedin","recipient_handle":"jdoe-watchdealer","template":"A","sent_at":"...","reply_status":"awaiting|replied|ignored","next_step":"..."}
```

## What NOT to do

- **Don't mass-DM** — LinkedIn will rate-limit at ~50 DMs/day from a new sender. Keep under 10/day for the first week.
- **Don't pitch the tool in DM #1** — share data first, position the tool as "happy to share the dataset" not "buy my product".
- **Don't follow up more than once** — one bump at Day +3 is fine. Twice = spam pattern.
- **Don't lie about who you are** — Yorick is the operator, not "Bob from sales". Authenticity converts.

## Reddit DM alternative (since Chrome MCP blocks reddit.com)

Reddit DMs are blocked by the safety filter. The harvested 10 Reddit prospects (saved to `/tmp/dealer-prospects.json`) are mostly collectors anyway, not dealers. Skip Reddit DMs entirely.

**Instead**: when Yorick pastes the r/Watches BHW data-analysis post manually (per reddit-blitz.md §1 v2), commenters who reply ARE the warm leads. Reply to them with the same data-first energy as Template A above.
