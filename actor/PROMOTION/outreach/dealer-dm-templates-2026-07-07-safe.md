# Dealer Outreach — Watch Arbitrage — safe-facts version — 2026-07-07

Use these instead of older templates that mention unverified fixed spreads.

## Persona A — professional pre-owned watch dealer

```text
Hi {first_name},

Saw your work around {specific brand/ref/inventory angle}. Quick question: when you price a Rolex/Patek/AP piece, how much weight do you put on Chrono24 asking prices vs actual dealer comps?

I’m building a small Apify actor that checks a reference across multiple public dealer sources and returns a normalized snapshot: source, country/market, USD price, median/min/max, and under-median candidates.

No pitch — I’m trying to ground-truth whether the snapshot matches how active dealers think about pricing.

If you send me 1-3 refs you trade often, I’ll run them and send the CSV/KV snapshot back.

Best,
Yorick
```

## Persona B — Chrono24 buyer / collector worried about a listing

```text
Hi {first_name},

Saw your question about {listing/ref}. The tricky thing with Chrono24 is that a “cheap” listing can be good signal or just risk: seller reviews, geography, condition, papers, stale ask, etc.

I built a small Apify actor that compares Rolex/Patek/AP refs across multiple public dealer sources so you can see whether a listing is actually under median or just weird.

If useful, send the reference and I’ll run a quick snapshot — no charge, I’m collecting feedback.
```

## Persona C — watch creator / dealer educator

```text
Hey {first_name},

Your point about Chrono24 asking prices not being real market value is exactly the problem I’ve been digging into.

I built a watch-pricing actor on Apify that takes a Rolex/Patek/AP ref and compares it across multiple dealer sources instead of anchoring on one Chrono24 comp.

Would you be open to me running a few refs from one of your videos and sending you the before/after snapshot? Could make a useful “asking price vs market median” data segment.
```

## Persona D — Apify / scraping dev

```text
Hey {first_name},

Saw you build scraping/data tools. I’m working on `kazkn/watch-arbitrage-mcp`: a TypeScript Apify actor that normalizes Rolex/Patek/AP listing data across multiple watch dealer DOMs, outputs dataset + KV snapshots, and can run as an MCP server in Standby.

The commodity part is “Chrono24 scraper”. The hard part is multi-source normalization + pricing guardrails + pay-per-event economics.

Would love your technical feedback if you’re open to taking a look:
https://github.com/DataKazKN/watch-arbitrage-mcp
```

## Follow-up after sending a free snapshot

```text
Quick follow-up — I ran the snapshot for {refs}.

What I’d like feedback on:

1. Does the median look directionally right vs your trade book?
2. Which sources would you trust / ignore?
3. Would hourly monitoring of these refs be useful, or is weekly enough?
4. What source is missing that would make this actually useful for you?

No need for a long reply — even “source X is garbage, add Y” helps.
```

## Tracking schema

Save to `PROMOTION/state/dealer-outreach-log.jsonl`:

```json
{"date":"2026-07-07","platform":"linkedin|email|reddit|youtube|tiktok","recipient":"...","persona":"dealer|collector|creator|dev","ref_offer":"...","status":"queued|sent|replied|snapshot_sent|converted|ignored","notes":"..."}
```

## Do not do

- Do not mention fixed JP→US spreads unless revalidated in a fresh run.
- Do not imply the actor gives investment advice.
- Do not promise “real-time” unless the user has scheduled runs.
- Do not pitch before offering a useful ref snapshot.
- Do not spam r/rolex DMs. Use public comments/replies first.
