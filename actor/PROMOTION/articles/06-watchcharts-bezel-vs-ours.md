---
title: Watchcharts vs Bezel vs my Apify Watch Arbitrage Tracker — feature-by-feature breakdown
published: false
description: Honest comparison of the 3 main watch price-tracking tools in 2026 — Watchcharts ($29/mo), Bezel Club ($20/mo), and a Pay-Per-Event Apify actor I built. Coverage, methodology, pricing, and which one to pick by use case.
tags: watches, tools, comparison, arbitrage
canonical_url:
cover_image:
series:
---

I built and run a watch arbitrage tracker on Apify Store. So when someone asks "should I pay for Watchcharts?" I'm not a neutral observer — I'm a competitor. This article is the honest comparison anyway, because the answer for most people isn't *my* tool.

Three options exist today for pro dealers and serious collectors who want cross-platform price data on luxury watches:

1. **Watchcharts** ($29/mo) — the dominant aggregator, claims 29,454 watches indexed
2. **Bezel Club** ($20/mo) — newer, mobile-first, lighter coverage
3. **Watch Arbitrage Tracker** (Pay-Per-Event on Apify, free to install) — my actor, 13 dealer marketplaces

Different tools, different use cases. Here's the breakdown.

## Quick verdict (TL;DR)

| If you... | Pick |
|---|---|
| Need a single appraisal estimate to value a watch you own | **Watchcharts** |
| Want a mobile app to browse market trends casually | **Bezel** |
| Source watches for resale and care about cross-country gaps | **my Apify actor** |
| Need MCP server access to query prices from Claude/ChatGPT | **my Apify actor** (only option) |
| Want to pay $0 when there's no signal to act on | **my Apify actor** (PPE) |
| Want a curated UI without setup friction | **Watchcharts** or **Bezel** |

The three tools solve different problems. The honest pitch for my actor is: it's not better than Watchcharts at *Watchcharts' job* (appraisal). It's better at a different job (real-time cross-platform spread detection for dealers).

## Side-by-side

| Capability | Watchcharts | Bezel | Apify Watch Arbitrage |
|---|---|---|---|
| **Pricing model** | $29/mo subscription | $20/mo subscription | Pay-Per-Event: $0.05/ref/day + $0.50/alert |
| **Free tier** | Limited free | Limited free | Full free tier via Apify $5/mo platform credit |
| **Watches indexed** | 29,454 (claim) | ~10K (estimated) | ~5K active at any time across 13 marketplaces |
| **Source coverage** | ~7 major marketplaces | ~5 major marketplaces | **13 dealer marketplaces** (incl. JP, DE, NYC vintage) |
| **Cross-country spread detection** | No | No | **Yes** (JP↔US, EU↔US, DE↔UK pairs) |
| **Real-time alerts (Telegram)** | No | No | **Yes** (configurable threshold, default 5%) |
| **Price guide / appraisal mode** | **Yes** (P50 + condition adjustment) | **Yes** | Not the primary use case |
| **Historical price charts** | **Yes** (months of history) | **Yes** (months of history) | Last 30 days via dataset export |
| **MCP server (for AI agents)** | No | No | **Yes** (query in Claude Desktop / Cursor) |
| **Mobile app** | iOS + Android | iOS + Android | None (it's an Apify actor, you run it on schedule) |
| **Source code** | Closed | Closed | **MIT open-source** (github.com/DataKazKN/watch-arbitrage-mcp) |
| **Direct dealer integrations** | Some affiliate relationships | Some | None (read-only scraping of public listing pages) |

## Where Watchcharts wins (don't skip this)

If you own a watch and want a single number for "what's it worth", Watchcharts is the best answer in 2026. They've spent 4+ years building a curated index of 29K+ models with condition-adjusted P50s. Their database is deeper than anything I scrape live.

The Watchcharts methodology:
- Aggregate listing + sold prices from multiple sources
- Curate per-model statistics over time
- Surface condition-adjusted estimates (full-set vs watch-only)
- Pretty UI for appraisal-style queries

If your need is "I'm selling my 116610LN — what's the right asking price?", Watchcharts at $29/mo gets you there in 30 seconds with a UI your grandmother could use.

The catch: Watchcharts publishes a **median estimate**. It doesn't show you which platform that estimate came from, or whether right now there's a $5K spread between WatchBox and Yahoo Japan. For appraisal, that's fine. For arbitrage sourcing, it's a different game.

## Where Bezel wins

Bezel is the mobile-friendly option. The app is well-designed, the data refreshes daily, and the social-feed-of-watches angle works for the casual collector who browses while commuting. Their pricing data is reliable for the top 50-100 most-traded refs.

Bezel's edge: better UX for casual browsing. If you don't need API access or alerts and you do most of your watch research on your phone, Bezel beats a desktop-only tool.

The catch: coverage is shallower than Watchcharts on long-tail refs, and like Watchcharts there's no cross-country alert dimension. If your trade book is heavy on JDM Seiko or German pre-owned Patek, you'll find Bezel surprisingly thin outside the loud-five US/UK majors.

## Where my Apify actor wins

The honest pitch: not at appraisal. At **finding mispriced listings in real time across 13 dealer marketplaces** including the 7 specialists Watchcharts and Bezel don't scrape.

**The 13 marketplaces**: Chrono24, WatchBox / The 1916 Company, Bob's Watches, Watchfinder UK, European Watch Co (Boston), Watches of Switzerland, The Watch Club (London + HK office), H. Spliedt (Munich), A Collected Man (London), Analog:Shift (NYC vintage), Bachmann & Scher (Munich), Yahoo Auctions Japan, plus the dormant Hodinkee Shop.

**The specific thing it does that the others don't**:

1. **Cross-country alerts**: when the JP-listed median for a ref is X% below the US-listed median, my actor pings your Telegram. "JP $148k ↔ US $192k — 22.7% spread on 5711/1A". Watchcharts and Bezel don't have this concept.

2. **Pay-Per-Event pricing**: you pay $0.05/ref/day to monitor + $0.50 only when a real spread fires. If the market is flat for 3 weeks, you pay almost nothing. With Watchcharts/Bezel you pay the monthly fee whether the market moves or not.

3. **MCP server mode**: the actor is also a Model Context Protocol server. You can ask Claude Desktop "what's the biggest Daytona spread right now?" and it queries the live dataset for you. This is unique to my actor in 2026 — Watchcharts and Bezel have no AI agent integration.

4. **Open-source**: the code is on GitHub (MIT-licensed). You can audit the median computation, the trimming logic, the per-platform normalization. With Watchcharts/Bezel, you trust their black box.

5. **Specialist coverage**: the 7 platforms I added (Watch Club, A Collected Man, Spliedt, Bachmann & Scher, Analog:Shift, Watches of Switzerland, Yahoo JP) are where the wider cross-country spreads hide. Watchcharts indexes some of these but doesn't surface cross-country gaps. Bezel barely covers them.

**The specific thing it does WORSE**:

1. **No mobile app**. It's an Apify actor + Telegram alerts. You set it up once with a JSON input, you read alerts on your phone. Not a UI-driven browse experience.

2. **Less historical depth**. Watchcharts has years of data. My actor has the last ~30 days of scraping. If you need to know "what was a 5711 worth in March 2023?", Watchcharts wins.

3. **More setup friction**. You need an Apify account (free). You configure your refs in a JSON input. You get a Telegram bot token. ~10 minutes setup vs Watchcharts' 30 seconds.

4. **Less curated data**. My actor surfaces raw listing prices with trimmed medians. Watchcharts shows you condition-adjusted estimates with confidence intervals. For appraisal, theirs is better.

## Pricing math: when does Pay-Per-Event beat $29/mo?

| Scenario | Monthly cost on my actor | Monthly cost on Watchcharts |
|---|---|---|
| 5 refs, market quiet (0 alerts) | $7.50/mo | $29/mo |
| 5 refs, 3 alerts/month | $9/mo | $29/mo |
| 20 refs, market quiet (0 alerts) | $30/mo | $29/mo |
| 20 refs, 10 alerts/month | $35/mo | $29/mo |
| 50 refs, 30 alerts/month | $90/mo | $29/mo |

The crossover is around 15-20 refs. If you watch fewer than 15 refs, my actor is cheaper. If you watch 50+ refs, Watchcharts is cheaper (assuming you don't mind their lack of alerts).

Most pro dealers I've talked to watch 5-15 refs intensively (their core trade book). For that profile, my actor is structurally cheaper and gets you cross-country alerts the others can't.

## The honest recommendation by persona

**Casual collector with 1-2 watches you might sell someday**: Watchcharts free tier or Bezel. You don't need real-time alerts.

**Active flipper with 5-15 refs you trade quarterly**: My actor. The cross-country alert + PPE pricing pays for itself the first time you catch a JP→US gap.

**Authorized Dealer with 100+ refs in inventory**: Watchcharts Pro for appraisal + my actor for arbitrage alerts on your top 20 refs. Different tools for different jobs.

**Vintage specialist (Analog:Shift, A Collected Man kind of inventory)**: My actor, because they cover the vintage specialists Watchcharts/Bezel don't. Use it to track competitive pricing on your inventory.

**AI agent / quant trader**: My actor, because it's the only one with an MCP server interface.

## What I'd improve about my own tool (since I'm being honest)

1. **No mobile app**. I should ship a simple PWA. Most dealers read alerts on phones.
2. **No appraisal UI**. I should add a "what's it worth" mode that hits the same data with a different lens.
3. **Limited historical depth**. I should retain rolling 12-month snapshots. Currently dataset retention is 30 days.
4. **Setup friction**. The Apify input schema is good but it's not 30 seconds. A guided onboarding flow would help.

Watchcharts has a 4-year head start on these. My tool is 4 weeks old in its current 13-platform form.

## How to try each

- **Watchcharts**: watchcharts.com — free tier, paid is $29/mo
- **Bezel**: bezel.com — free tier with limits, paid is $20/mo
- **My Apify actor**: https://apify.com/kazkn/watch-arbitrage-mcp?fpr=8fp2od — free to install, $0.05/ref/day + $0.50/alert
- **My GitHub** (source code): github.com/DataKazKN/watch-arbitrage-mcp

If you build watch-related tools, the source is MIT-licensed — fork or contribute. The most useful PR would be platform #14 (a market I haven't covered yet — recommendations welcome in comments).

---

*Built solo. No paid placement. Watchcharts and Bezel are the established tools; I'm the new option with a narrower-but-deeper focus.*
