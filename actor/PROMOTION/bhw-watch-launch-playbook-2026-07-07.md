# BHW-style Launch Playbook — Watch Arbitrage — 2026-07-07

## Brutal truth

The deploy makes the actor monetizable and safer. It does **not** guarantee revenue by itself.

Revenue comes from proof + distribution:

1. show a real watch-pricing pain people already discuss;
2. publish useful data, not a product pitch;
3. answer comments like a human operator;
4. offer to run refs for people;
5. convert warm replies into Apify runs/reviews.

This is the BHW lesson from the jeffz-style playbook: **targeted data posts can convert better than viral story posts** because they attract people already inside the problem.

## What we learned from BHW and how it maps here

### 1. Do not start with the product

Bad:

> “I built an Apify actor that finds watch arbitrage. Try it here.”

This screams tool pitch and gets ignored/modded.

Good:

> “I compared Chrono24 asking prices against dealer-source medians. The lowest listing is not always the safest comp.”

That starts inside the buyer’s pain.

### 2. Use exact buyer language

From the watch research scan:

- “Buying from Chrono24?”
- “lowest priced on Chrono24”
- “seller has no reviews”
- “box and papers”
- “verification”
- “asking price isn’t a selling price”
- “how accurate are Chrono24 prices compared to the real market?”

Use these phrases verbatim. Do not replace them with polished SaaS wording like “cross-platform market intelligence”. That language is for Apify/GitHub, not Reddit buyers.

### 3. Data post first, CTA last

The post should be 95% useful data/methodology, 5% soft disclosure.

Structure:

1. Pain hook: Chrono24 asking prices are useful but dangerous as single comps.
2. Method: run refs across multiple public dealer sources.
3. Example: show one or more real output rows / market snapshots.
4. Caveats: seller reputation, condition, papers, customs, stale listings still matter.
5. Question: ask how people price watches today.
6. Soft CTA in comments only: offer to run refs.

## Immediate proof artifact to use

Cloud smoke after deploy produced a real listing:

- run: `GePr0wzNH80fxaQK9`
- build: `0.1.33`
- ref: `124060`
- platform: `bobs`
- country: `US`
- title: `Pre-Owned Rolex Submariner Stainless Steel No Date Dial Ref 124060`
- price: `$14,595`
- market snapshot median/min/max: `$14,595` from 1 source
- PPE verified: `actor-start=1`, `reference-monitored=1`, `apify-default-dataset-item=1`

This is not enough for a huge arbitrage claim. It **is** enough to prove the actor runs live, produces dataset rows, writes KV snapshots, and charges PPE correctly.

## Next proof run needed before Reddit

Before posting in r/Watches, run a multi-source proof snapshot for 3 liquid refs:

- `124060`
- `116500LN`
- `5711/1A-010`

Target sources:

- `bobs`
- `chrono24`
- `watchfinder`
- `watchbox`

Goal is not to claim “guaranteed arbitrage”. Goal is to show:

- per-ref median/min/max;
- which sources returned data;
- whether lowest listing is an outlier;
- how cross-source context changes the decision.

If a source times out or returns 0, include that honestly. Trust beats fake certainty.

## Reddit post draft — BHW Type B data post

Subreddit: `r/Watches`

Title:

```text
Chrono24 asking prices vs dealer-source medians — how do you sanity-check a “cheap” Rolex/Patek listing?
```

Body:

```text
I’ve been digging into watch pricing data and one thing keeps coming up:

Chrono24 is useful, but a single Chrono24 asking price is a dangerous comp.

A “cheap” listing can be cheap because it is genuinely under market.

Or it can be cheap because:

- seller has no reviews
- box/papers are unclear
- condition notes are doing a lot of work
- geography/import costs change landed price
- ask is stale
- the dealer expects negotiation
- it is just a weird outlier

So I started comparing refs across public dealer sources instead of treating one marketplace as the market.

The useful output is boring:

- ref
- source marketplace
- country/market
- USD-normalized ask
- direct listing title/URL when available
- median/min/max per ref
- sources covered
- under-median candidates

Example from a live run after deploy:

- Rolex Submariner 124060
- Bob’s Watches
- US market
- listing title: “Pre-Owned Rolex Submariner Stainless Steel No Date Dial Ref 124060”
- price: $14,595

That one row alone does not tell you whether it is a buy. The point is the opposite: one row is not enough. You need the cross-source median before deciding whether the listing is actually cheap or just looks cheap.

I’m going to run the same check across multiple sources for 124060 / 116500LN / 5711 next.

For people here who buy/sell regularly: what sources do you trust more than Chrono24 asking prices when pricing a watch?
```

First comment if discussion is positive:

```text
I built a small Apify actor for this because I got tired of manually checking sources. Not trying to spam the link — if anyone wants, reply with a ref and I’ll run a public snapshot.
```

## Comment reply patterns

### If someone says “Chrono24 is fine”

```text
Agreed, Chrono24 is useful. My point is narrower: it’s a bad single-source anchor. I still want Chrono24 in the dataset, just not as the only comp.
```

### If someone asks for the tool

```text
It’s an Apify actor called Watch Arbitrage Tracker. I can share the link, but honestly the more useful thing is: send me a ref and I’ll run it so you can judge the output before caring about the tool.
```

### If someone attacks scraping

```text
Fair concern. I’m only using public listing data and treating this as a pricing sanity check, not investment advice or seller verification. Due diligence still matters: seller, condition, papers, shipping, tax, customs.
```

### If someone says “asking price isn’t sold price”

```text
Exactly. That’s why I’m not treating any single listing as truth. The actor is a first-pass radar: what’s listed where, how far it is from median, and whether it deserves human review.
```

## 7-day BHW-style loop

### Day 0 — proof

- Actor deployed and cloud smoke verified.
- Run multi-source snapshot for 3 refs.
- Export dataset + KV summary.
- Create one screenshot/markdown proof artifact.

### Day 1 — Reddit data post

- Post in `r/Watches` only.
- No Apify link in title.
- No product link in body unless mods/community ask.
- Reply to every comment in first 2 hours.

### Day 2 — mine comments

- Extract exact objections/questions from the post.
- Add them to `PROMOTION/watch-arb-boost-2026-07-07.md`.
- Turn best objection into a product/README section.

### Day 3 — creator comments

Comment under 10 TikTok/YouTube videos about:

- Chrono24 pricing;
- “how much is my Rolex worth?”;
- dealer margins;
- buying from Chrono24;
- watch price tracking.

CTA: “reply with a ref, I’ll run a snapshot.”

### Day 4 — direct dealer outreach

Send 10 highly personalized DMs using the safe templates.

Offer:

> “Send 1-3 refs you trade often; I’ll return CSV + market snapshot.”

### Day 5 — publish technical/dev proof

Post dev.to or GitHub thread:

> “Production Apify actor for watch-pricing snapshots: PPE guard, Camoufox baked into Docker, cross-source dataset outputs.”

### Day 6-7 — measure / decide

Track:

- actor runs;
- unique users;
- charged events;
- dataset rows;
- replies asking for ref runs;
- reviews/bookmarks;
- source/ref requests.

## Revenue expectation

This actor is now capable of making money per useful run:

- `reference-monitored` charges fired in cloud smoke;
- dataset item charge fired in positive smoke;
- economics guard no longer blocks profitable starter runs;
- Camoufox runtime download no longer kills first run.

But money is **not guaranteed** until distribution generates buyer runs.

7-day success threshold:

- 30+ runs;
- 10+ unique users;
- 3+ human replies asking for a ref snapshot;
- 1 review or bookmark from a real user;
- positive net revenue after smoke/testing costs.

If this does not happen, we do not write more generic content. We change the angle or target buyers harder.
