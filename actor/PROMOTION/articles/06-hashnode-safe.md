# Watchcharts vs Bezel vs a custom Apify watch-arbitrage tracker — feature-by-feature breakdown

I built and run a watch arbitrage tracker on Apify Store. So when someone asks "should I pay for Watchcharts?" I'm not a neutral observer — I'm a competitor. This article is the honest comparison anyway, because the answer for most people isn't *my* tool.

Three options exist today for pro dealers and serious collectors who want cross-platform price data on luxury watches:

1. **Watchcharts** ($29/mo) — the dominant aggregator, claims 29,454 watches indexed
2. **Bezel Club** ($20/mo) — newer, mobile-first, lighter coverage
3. **A custom Apify-based Watch Arbitrage Tracker** (Pay-Per-Event, free to install) — 13 dealer marketplaces

Different tools, different use cases. Here's the breakdown.

## Quick verdict (TL;DR)

| If you... | Pick |
|---|---|
| Need a single appraisal estimate to value a watch you own | **Watchcharts** |
| Want a mobile app to browse market trends casually | **Bezel** |
| Source watches for resale and care about cross-country gaps | **The Apify-based tracker** |
| Need MCP server access to query prices from Claude/ChatGPT | **The Apify-based tracker** (only option) |
| Want to pay $0 when there's no signal to act on | **The Apify-based tracker** (PPE) |
| Want a curated UI without setup friction | **Watchcharts** or **Bezel** |

The three tools solve different problems.

## Side-by-side

| Capability | Watchcharts | Bezel | Apify Watch Arbitrage |
|---|---|---|---|
| **Pricing model** | $29/mo subscription | $20/mo subscription | Pay-Per-Event: $0.05/ref/day + $0.50/alert |
| **Free tier** | Limited free | Limited free | Free tier via Apify $5/mo platform credit |
| **Watches indexed** | 29,454 (claim) | ~10K (estimated) | ~5K active at any time across 13 marketplaces |
| **Source coverage** | ~7 major marketplaces | ~5 major marketplaces | **13 dealer marketplaces** (incl. JP, DE, NYC vintage) |
| **Cross-country spread detection** | No | No | **Yes** (JP↔US, EU↔US, DE↔UK pairs) |
| **Real-time alerts (Telegram)** | No | No | **Yes** (configurable threshold, default 5%) |
| **Price guide / appraisal mode** | **Yes** (P50 + condition adjustment) | **Yes** | Not the primary use case |
| **Historical price charts** | **Yes** (months of history) | **Yes** (months of history) | Last 30 days via dataset export |
| **MCP server (for AI agents)** | No | No | **Yes** (query in Claude Desktop / Cursor) |
| **Mobile app** | iOS + Android | iOS + Android | None (Apify actor, run on schedule) |
| **Source code** | Closed | Closed | **MIT open-source** |
| **Direct dealer integrations** | Some affiliate relationships | Some | None (read-only scraping) |

## Where Watchcharts wins

If you own a watch and want a single number for "what's it worth", Watchcharts is the best answer in 2026. They've spent 4+ years building a curated index of 29K+ models with condition-adjusted P50s.

The catch: Watchcharts publishes a **median estimate**. It doesn't show you which platform that estimate came from, or whether right now there's a $5K spread between WatchBox and Yahoo Japan. For appraisal, that's fine. For arbitrage sourcing, it's a different game.

## Where Bezel wins

Bezel is the mobile-friendly option. The app is well-designed, the data refreshes daily, and the social-feed-of-watches angle works for the casual collector who browses while commuting. Their pricing data is reliable for the top 50-100 most-traded refs.

The catch: coverage is shallower than Watchcharts on long-tail refs, and like Watchcharts there's no cross-country alert dimension.

## Where the Apify-based tracker wins

The honest pitch: not at appraisal. At **finding mispriced listings in real time across 13 dealer marketplaces** including the 7 specialists Watchcharts and Bezel don't scrape.

**The 13 marketplaces**: Chrono24, WatchBox / The 1916 Company, Bob's Watches, Watchfinder UK, European Watch Co (Boston), Watches of Switzerland, The Watch Club (London + HK office), H. Spliedt (Munich), A Collected Man (London), Analog:Shift (NYC vintage), Bachmann & Scher (Munich), Yahoo Auctions Japan, plus the dormant Hodinkee Shop.

**The specific thing it does that the others don't**:

1. **Cross-country alerts**: when the JP-listed median for a ref is X% below the US-listed median, the actor pings your Telegram. "JP $148k ↔ US $192k — 22.7% spread on 5711/1A". Watchcharts and Bezel don't have this concept.

2. **Pay-Per-Event pricing**: you pay $0.05/ref/day to monitor + $0.50 only when a real spread fires. If the market is flat for 3 weeks, you pay almost nothing.

3. **MCP server mode**: the actor is also a Model Context Protocol server. You can ask Claude Desktop "what's the biggest Daytona spread right now?" and it queries the live dataset for you.

4. **Open-source**: the code is on GitHub (MIT-licensed). You can audit the median computation, the trimming logic, the per-platform normalization.

5. **Specialist coverage**: the 7 platforms added (Watch Club, A Collected Man, Spliedt, Bachmann & Scher, Analog:Shift, Watches of Switzerland, Yahoo JP) are where the wider cross-country spreads hide.

**What it does WORSE**:

1. **No mobile app**. It's an Apify actor + Telegram alerts.
2. **Less historical depth**. Watchcharts has years of data, this has 30 days.
3. **More setup friction**. ~10 minutes vs Watchcharts' 30 seconds.
4. **Less curated data**. Raw trimmed medians, not condition-adjusted appraisal.

## Pricing math: when does Pay-Per-Event beat $29/mo?

| Scenario | Monthly cost (Apify) | Monthly cost (Watchcharts) |
|---|---|---|
| 5 refs, market quiet (0 alerts) | $7.50/mo | $29/mo |
| 5 refs, 3 alerts/month | $9/mo | $29/mo |
| 20 refs, market quiet (0 alerts) | $30/mo | $29/mo |
| 20 refs, 10 alerts/month | $35/mo | $29/mo |
| 50 refs, 30 alerts/month | $90/mo | $29/mo |

The crossover is around 15-20 refs. If you watch fewer than 15 refs, the Apify-based tracker is cheaper. Watch 50+ refs without alerts, Watchcharts is cheaper.

## The honest recommendation by persona

- **Casual collector** with 1-2 watches: Watchcharts free tier or Bezel.
- **Active flipper** with 5-15 refs you trade quarterly: the Apify-based tracker.
- **Authorized Dealer** with 100+ refs in inventory: Watchcharts Pro for appraisal + the Apify tracker for arbitrage alerts on top 20 refs.
- **Vintage specialist**: the Apify tracker (covers the specialists Watchcharts/Bezel don't).
- **AI agent / quant trader**: the Apify tracker (only one with MCP server interface).

## What I'd improve about the Apify tracker (since I'm being honest)

1. **No mobile app**. Should ship a simple PWA.
2. **No appraisal UI**. Should add a "what's it worth" mode.
3. **Limited historical depth**. Should retain rolling 12-month snapshots.
4. **Setup friction**. The Apify input schema is good but not 30 seconds.

Watchcharts has a 4-year head start on these. The actor is 4 weeks old in its current 13-platform form.

---

*Disclosure: I built and operate the Apify-based tracker mentioned in this comparison. Code is MIT-licensed on GitHub. Watchcharts and Bezel are independent products; comparison is based on their public documentation and my hands-on use.*
