# Watch Arbitrage Tracker — Patek/Rolex/AP Cross-Platform Alerts

> **Apify Actor source code.** A cross-platform price arbitrage tracker for professional watch dealers trading Patek Philippe, Rolex, and Audemars Piguet across **Chrono24**, **WatchBox / The 1916 Company**, **Bobs Watches**, **Watchfinder UK**, **European Watch Co**, and **Watches of Switzerland**. Real-time Telegram alerts when a listing is mispriced cross-platform. Doubles as an MCP server for AI agents.

[**▶ Try it on Apify Store**](https://apify.com/kazkn/watch-arbitrage-mcp) — runs in the cloud, free tier sufficient for most dealers.

[![Apify Actor](https://img.shields.io/badge/Apify-Actor-blue?logo=apify)](https://apify.com/kazkn/watch-arbitrage-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## What's in this repo

This repository is the **public source** for the Apify Actor `kazkn/watch-arbitrage-mcp`. The full product documentation, screenshots, input schema, dealer-facing tutorial, and pricing tables live in [`actor/README.md`](./actor/README.md) — that's the file rendered on the [Actor's Apify Store page](https://apify.com/kazkn/watch-arbitrage-mcp).

Use this repository if you want to:

- **Read the source code** for a working multi-platform Apify Actor (Crawlee + Camoufox + Apify Standby + MCP server).
- **Fork and adapt** the architecture for arbitrage in other reference-driven secondary markets (sneakers, art, fine wine, graded cards, handbags).
- **Open an issue** about a bug or a feature request.
- **Contribute** (see [`CONTRIBUTING.md`](CONTRIBUTING.md)).

## Repository layout

```
.
├── actor/                   # The Apify Actor itself (deployed to Apify Cloud)
│   ├── .actor/              # Actor manifest, input/output/dataset/KV schemas, OpenAPI 3.0
│   ├── .github/workflows/   # Local actor CI (test on push)
│   ├── assets/screenshots/  # Images embedded in actor/README.md
│   ├── src/
│   │   ├── crawlers/        # One file per source platform
│   │   ├── utils/           # Brand detection, URL builders, FX
│   │   ├── aggregator.ts    # Sub-ref grouping + trimmed median + spread detection
│   │   ├── alerts.ts        # Telegram dispatcher (with 24h dedup)
│   │   ├── server.ts        # Apify Standby HTTP server (REST + MCP JSON-RPC)
│   │   └── main.ts          # Entry point (mode dispatcher: batch vs standby)
│   ├── test/                # Jest unit tests
│   ├── Dockerfile           # Container for Apify build pipeline
│   ├── README.md            # The Apify Store landing page (full product docs)
│   └── package.json         # apify, crawlee, camoufox, express
├── .github/workflows/       # Repo-level CI (build + test on every push)
├── LICENSE                  # MIT
└── CONTRIBUTING.md          # Contribution guidelines
```

## Quick start (run locally)

```bash
git clone https://github.com/DataKazKN/watch-arbitrage-mcp.git
cd watch-arbitrage-mcp/actor
npm install
npm run build

# Local run (writes to ./storage/ — not synced to Apify Cloud)
npx apify run

# Or test the server entry point directly
node dist/server.js
```

To deploy your own fork to Apify Cloud:

```bash
npm install -g apify-cli
apify login
apify push
```

Per Apify's [GitHub integration guide](https://docs.apify.com/platform/integrations/github), you can also wire this repo to auto-rebuild your Actor on every `git push` via a webhook — see [`.github/workflows/apify-build.yml`](.github/workflows/apify-build.yml).

## Architecture highlights

- **Per-platform crawler files** — every source has its own ~100-line module conforming to the same `Listing` shape, so the aggregator stays platform-agnostic.
- **Camoufox + Apify proxy rotation** for Cloudflare-protected sources (Chrono24, Bobs).
- **Sub-reference grouping** — listings are grouped by *extracted* sub-reference (e.g. `5711/1A-010` vs `7011/1G`), not by user search term, to avoid conflating men's vs ladies' sub-models in the median computation.
- **Trimmed median** — drops the top/bottom 10% before computing the median, to absorb dealer-listing outliers (e.g. one $3.8M typo or one $200K above-market piece) without skewing the spread baseline.
- **Dual entry point** — same Docker image runs as a batch crawler under cron, OR as an MCP server in Apify Standby mode (handled by `Actor.config.get('metaOrigin') === 'STANDBY'` in `main.ts`).
- **Pay-Per-Event monetization** — charges per `actor-start`, per `reference-monitored`, per `apify-default-dataset-item`, and per `spread-alert-triggered` (the primary value event). Spending limit (`ACTOR_MAX_TOTAL_CHARGE_USD`) is honored, so a runaway alert spike never blows past the user's cap.

## Documentation

- [Full product README + dealer tutorial + pricing](./actor/README.md)
- [Input schema](./actor/.actor/input_schema.json)
- [Output schema](./actor/.actor/output_schema.json)
- [Dataset schema](./actor/.actor/dataset_schema.json)
- [OpenAPI 3.0 spec for MCP server](./actor/.actor/web_server_openapi.json)

## License

[MIT](./LICENSE) — fork freely, build commercial products, no attribution required.

## Contributing

Issues and pull requests welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Adding a new source platform takes roughly 30 minutes following the existing crawler template (`actor/src/crawlers/chrono24.ts` is the cleanest reference implementation).
