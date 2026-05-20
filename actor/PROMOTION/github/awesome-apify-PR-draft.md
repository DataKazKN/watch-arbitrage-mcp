# GitHub PR drafts — get watch-arb + Vinted into curated lists

## PR 1 — apify/actor-mcp-servers (OFFICIAL Apify MCP list, 19 stars)

**Target repo**: https://github.com/apify/actor-mcp-servers
**Branch**: `add-kazkn-watch-arbitrage-mcp`
**PR title**: Add Watch Arbitrage Tracker MCP Server (cross-platform watch dealer pricing)

**File to edit**: `README.md` — append a row to the "Available servers" table.

### The README row to append

```markdown
| **[Watch Arbitrage Tracker MCP Server](./watch-arbitrage-mcp/)** | Cross-platform watch dealer pricing data (Rolex/Patek/AP). Tracks 13 dealer marketplaces (Chrono24, WatchBox, Bob's, Watchfinder, European Watch, Watches of Switzerland, Watch Club, Spliedt, A Collected Man, Analog:Shift, Bachmann & Scher, Yahoo Japan + Hodinkee). Cross-country spread detection. | [![Watch Arbitrage Tracker](https://apify.com/actor-badge?actor=kazkn/watch-arbitrage-mcp)](https://apify.com/kazkn/watch-arbitrage-mcp) | [DataKazKN](https://github.com/DataKazKN) |
```

### PR body

```markdown
Adds the **Watch Arbitrage Tracker MCP Server** to the Available Servers list.

## What this is

A production-ready MCP server (and dual-mode batch actor) that scrapes 13 luxury watch dealer marketplaces and exposes the live dataset via three MCP JSON-RPC methods:

- `get_arbitrage_snapshot` — current top cross-country spreads
- `get_market_stats` — per-reference P50 / P10 / P90 across all platforms
- `get_listings_by_ref` — raw listings for a specific reference

Connect via Claude Desktop / Cursor / ChatGPT, then ask in plain language: *"What's the biggest Daytona spread right now?"* or *"Show me all 5711s under $180k."*

## Why it fits this list

- Production-ready: tested live with 13/13 platforms returning data on real watch references (5711/1A-010, 116500LN, 15500ST)
- Apify Standby mode for instant HTTP responses
- Pay-Per-Event pricing: $0.05/ref/day + $0.50/alert, free to install
- MIT-licensed source: https://github.com/DataKazKN/watch-arbitrage-mcp
- 43/43 unit tests passing (build 0.1.28)

## Difference from existing wrappers

Unlike most entries in this list (which wrap open-source stdio MCP servers), this is a **new MCP server I built directly** for the niche of cross-platform watch arbitrage. The data layer is unique — no existing public MCP server exposes luxury-watch dealer pricing across 13 marketplaces with cross-country gap detection.

Happy to add a `watch-arbitrage-mcp/` subdirectory to this monorepo with a thin README pointing to the canonical repo if that's the preferred format. Or to leave the canonical at DataKazKN/watch-arbitrage-mcp.

## Verification

- Apify Store listing: https://apify.com/kazkn/watch-arbitrage-mcp
- Source code: https://github.com/DataKazKN/watch-arbitrage-mcp (MIT)
- Test run: https://console.apify.com/actors/9iq5qYbcy7F4dEqFe (build 0.1.28)
```

### Commands to submit

```bash
# Fork apify/actor-mcp-servers first via gh CLI
gh repo fork apify/actor-mcp-servers --clone --remote
cd actor-mcp-servers

# Create branch + apply README change
git checkout -b add-kazkn-watch-arbitrage-mcp
# (edit README.md — append the row above to the "Available servers" table)
git add README.md
git commit -m "Add Watch Arbitrage Tracker MCP Server"
git push origin add-kazkn-watch-arbitrage-mcp

# Create PR via gh
gh pr create --repo apify/actor-mcp-servers --title "Add Watch Arbitrage Tracker MCP Server (cross-platform watch dealer pricing)" --body-file ../actor/PROMOTION/github/awesome-apify-PR-draft.md
```

---

## PR 2 — lorien/awesome-web-scraping (canonical list, 7908 stars)

**Target repo**: https://github.com/lorien/awesome-web-scraping
**Branch**: `add-watch-arbitrage-mcp`
**File to edit**: likely `webservice.md` (services section) or per-language file

### Check the format first

```bash
gh repo clone lorien/awesome-web-scraping
cd awesome-web-scraping
ls -la
# Look for: README.md, javascript.md, services.md, etc.
# Find where similar entries (Apify, ScrapingHub) live and match the format.
```

### Likely entry format

If the list uses bullet lists with `[Name](URL) — description`:

```markdown
- [Watch Arbitrage Tracker](https://github.com/DataKazKN/watch-arbitrage-mcp) — Cross-platform luxury watch dealer pricing scraper. TypeScript + Crawlee + Playwright, scrapes 13 dealer marketplaces, computes trimmed median, fires Telegram alerts on cross-country spreads. MIT-licensed. Also exposes data via Model Context Protocol for AI agents.
```

### PR body

```markdown
Adds the Watch Arbitrage Tracker — a production cross-platform luxury watch pricing scraper.

## What it is

TypeScript + Crawlee + Playwright actor that scrapes 13 watch dealer marketplaces (Chrono24, WatchBox, Bob's, Watchfinder, European Watch Co, Watches of Switzerland, Watch Club, Spliedt, A Collected Man, Analog:Shift, Bachmann & Scher, Yahoo Japan, Hodinkee Shop). Computes cross-platform median pricing with 10% winsorized trimming. Fires Telegram alerts when listings break below threshold.

## Why it might be useful for this list

- Real-world example of multi-marketplace normalization across 13 different DOMs (each with its own quirks: Cloudflare bypass, JPY-USD FX, German thousand-dots, geo-blocks)
- Apify Standby + MCP server architecture (newer pattern, might inspire similar projects)
- 43/43 unit tests covering FX edge cases, brand detection, aggregator logic
- Production-deployed (build 0.1.28 on Apify Store)

## Verification

- Source: https://github.com/DataKazKN/watch-arbitrage-mcp (MIT)
- Live actor: https://apify.com/kazkn/watch-arbitrage-mcp
- Stack: TypeScript + Crawlee + Playwright + Camoufox + Apify Proxy

Open to format adjustments if the entry doesn't match the list's style.
```

---

## Day 9 execution (when the scheduled task hits this)

1. Verify Yorick is logged in to GitHub via gh CLI (`gh auth status`)
2. Submit PR 1 first (apify/actor-mcp-servers — official, highest-conversion)
3. Wait 24h for any Apify-team feedback (they may request format changes)
4. Submit PR 2 second (lorien/awesome-web-scraping — broad reach, slower-burn)
5. Log both PR URLs to `state/action-log.jsonl`
6. Set up GitHub notifications so any maintainer comment routes to Yorick

Expected outcomes:
- PR 1 acceptance probability: ~60% (it's a real MCP server, fits the list intent, just not a wrapper)
- PR 2 acceptance probability: ~40% (the list is huge but curated, may already have similar entries)
- Combined expected value: 1 accepted PR = +5-30 GitHub stars over 30 days + 1-3 direct trial users from the curated-list visibility
