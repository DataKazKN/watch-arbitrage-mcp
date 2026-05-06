# Contributing

Thanks for considering a contribution.

## Quick start for contributors

```bash
git clone https://github.com/DataKazKN/watch-arbitrage-mcp.git
cd watch-arbitrage-mcp/actor
npm install
npm run build
npm test
```

To run the actor locally with the Apify CLI:

```bash
npm install -g apify-cli
apify run            # writes to local ./storage/ (NOT synced to Apify Cloud)
```

## What we welcome

| Contribution | How to start |
|---|---|
| **New source platform** (e.g. Antiquorum, Joseph Bonnie, Chrono24 Trusted Checkout feed) | Copy `actor/src/crawlers/chrono24.ts`, adapt selectors + URL builder in `actor/src/utils/url.ts`, add the platform to the `Platform` enum in `actor/src/types.ts`, register in `actor/src/main.ts`, ship a PR. |
| **Bug fix on an existing crawler** | Open an issue first with the failing input + observed log lines so we can reproduce. Then PR with a regression test in `actor/test/`. |
| **New brand support** (e.g. Vacheron Constantin, A. Lange & Söhne, Richard Mille) | Extend `detectBrand()` and `extractSubRef()` in `actor/src/utils/brand.ts` and `actor/src/aggregator.ts` respectively, add brand-specific regex with examples in the doc-comment. |
| **MCP tool addition** | Extend `actor/src/server.ts` with the new HTTP route and the matching JSON-RPC tool handler. Update `actor/.actor/web_server_openapi.json`. |
| **Documentation improvements** | Edit `actor/README.md` (product-facing) or `README.md` (developer-facing). |

## Coding standards

- **TypeScript strict mode** — `tsc --noEmit` must pass before commit.
- **Prettier + ESLint** — run `npm run lint:fix` before pushing. Config is in `actor/.prettierrc` and `actor/eslint.config.mjs`.
- **No `any` in application code** — use `unknown` for external/untrusted input and narrow safely.
- **Surgical changes** — touch only what your fix or feature requires. Don't refactor adjacent unrelated code in the same PR.
- **Per-platform isolation** — never assume two source platforms share a DOM convention. Each crawler owns its own selectors, ref-matching strategy, and field-extraction logic.
- **Anti-bot etiquette** — if a target platform isn't tractable with Camoufox + standard Apify proxy, don't escalate to fingerprint-faking or CAPTCHA-solving. Open an issue and discuss the approach first.

## Testing

```bash
cd actor
npm test
```

Unit tests cover the aggregator, the FX module, the URL builder, and the brand detection logic. Integration tests against live source sites are intentionally not part of CI (sites change daily — we run them manually before each release).

## Pull request process

1. Fork the repo.
2. Create a descriptive branch (e.g. `crawler/joseph-bonnie`, `fix/chrono24-eur-format`).
3. Make your change with at least one test (or a screenshot of a successful manual run if it's a crawler change).
4. Run `npm run lint:fix && npm test && npx tsc --noEmit` locally.
5. Open the PR with:
   - The problem (1-2 sentences)
   - The fix (1-2 sentences)
   - How you verified it works (test output, screenshot, log snippet)
6. Apify CI auto-runs on push; we'll review within a few days.

## Reporting bugs

Please include:
- Apify run URL if relevant (we can read the logs)
- The input you used (omit secrets like Telegram bot tokens)
- The expected vs. actual behavior
- The actor build number (visible in the run summary header)

## License

By contributing you agree your contributions are released under the [MIT License](LICENSE).
