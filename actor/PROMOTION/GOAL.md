# GOAL v2 (updated 2026-05-21): paying customers on BOTH actors

> **Updated contract**: Claude won't stop iterating until **both** `watch-arbitrage-mcp` AND `vinted-smart-scraper` have **at least 1 paying customer** (user with actual PPE charges past Apify's $5/mo free credit). Set 2026-05-21 by Yorick.
>
> Secondary metric (kept for reference): $50/day Apify revenue 7-day trailing avg.

## Why the pivot

Vinted has 369 total users but most use it within free tier. The watch-arb actor has 4 users, $0 revenue. Real validation = first paid user on each, not aggregate vanity revenue.

## Detection method

Daily loop queries Apify API for per-actor:
- `userPaidEvents30Days` (if available) OR
- `revenue30Days` divided by avg PPE = approx paid-user count

A paying user = someone whose 30-day PPE charges > $0 after their free $5/mo platform credit. Apify dashboard surfaces this under "Revenue by user".

---

## Current baseline (2026-05-20)

| Actor | Status | 30-day runs | Users | Est. monthly revenue |
|---|---|---|---|---|
| kazkn/vinted-smart-scraper | Live (since 2026-01) | ~22K | 90 (30d) | ~$500/mo = **$16.7/day** |
| kazkn/watch-arbitrage-mcp | Live (since 2026-05) | 22 | 4 | ~$0-2/mo = **$0.07/day** |
| Other 4 actors (CRE, Vinted Turbo, MCP, GPT Crawler) | Live | low | small | minor |
| **Combined baseline** | | | | **~$17/day** |

Goal: **$50/day** = need 3x revenue lift = either Vinted scales to ~$30/day + watch-arb breaks $20/day, or some other mix.

## Success criteria

- ✅ **STOP**: 7-day trailing avg of total kazkn revenue ≥ $50/day
- ⚠️ **PAUSE & ASK YORICK**: if I hit any of:
  - Spent > $20 on Apify actor runs / paid services without revenue lift
  - Apify Store posted a warning / suspended any actor
  - LinkedIn/X/dev.to flagged the account for spam
  - 30 days elapsed with no measurable revenue lift (< +5% MoM)
- ❌ **KILL SWITCH**: Yorick can stop the loop anytime by editing `actor/PROMOTION/state/loop-state.json` and setting `paused: true`

## Daily loop spec

Runs daily at 09:00 CEST via Claude scheduled task `kazkn-revenue-goal-loop`.

Each run:

1. **Measure**: fetch revenue via Apify API. Compute 7-day trailing avg. Save to `state/revenue-log.jsonl`.
2. **Decide**:
   - If trailing avg ≥ $50/day → STOP. Send completion message to Yorick.
   - Else → pick next action from `state/action-queue.json` and execute.
3. **Execute**: action drawn from one of the categories below.
4. **Verify**: post-action — wait 12-24h, then on next loop run measure delta in revenue / installs / engagement.
5. **Learn**: log result (success / null / fail) to `state/action-log.jsonl`. Adjust priority weights for future picks.

## Action categories (priority weighted)

Each daily loop picks ONE action from this menu (weighted by past results):

| Cat | Action | Effort | Expected lift | Cooldown |
|---|---|---|---|---|
| A | Publish next article (dev.to via API) | low (I draft, publish via API) | +10-50 visitors/article | 3 days between articles |
| B | Post X tweet (data point or update) | low (Chrome MCP) | +5-30 X impressions, occasional click | 1 day between |
| C | Post LinkedIn update | low (Chrome MCP) | +50-200 LinkedIn views | 2 days between |
| D | Refresh Apify Store description (test SEO variants) | low (API) | TBD — measure via Search Console | 7 days |
| E | Email-draft for Yorick to send (industry outreach) | low (markdown file) | Yorick has to act | 5 days |
| F | YouTube short script for Yorick to film | low (markdown) | Yorick has to film | 5 days |
| G | GitHub-side action: PR to awesome-apify list, comment in Apify GitHub issues | medium (research + PR) | +5-20 stars, small revenue | 7 days |
| H | Run a free Reddit JSON harvest, refresh data in next article | low (script) | feeds next article | 7 days |
| I | Send DM to Yorick prompting him to: paste Reddit posts manually, reply to LinkedIn DMs, etc | low (TaskCreate or chat) | Yorick has to act | 2 days |
| J | A/B test a different post format on X | low | TBD | 3 days |

## Initial action queue (Day 1-10)

The first 10 days have a pre-built order. After Day 10, the loop self-builds the queue from past performance.

| Day | Action | Category |
|---|---|---|
| 1 (today) | Publish Article #1 (Patek 5711 data) to dev.to | A |
| 1 | Draft Article #6 + #9 (saved for Day 3, 6) | (prep) |
| 1 | Draft 5 YouTube shorts + 5 outreach emails | (prep, for Yorick) |
| 2 | X: self-reply to thread Tweet 1 with "Article live: link" | B |
| 2 | LinkedIn: post about Article #1 with link | C |
| 3 | Publish Article #6 (Watchcharts vs ours) to Medium + dev.to | A |
| 4 | X: data update tweet (last 24h spreads detected) | B |
| 5 | Refresh Apify Store description A/B variant | D |
| 6 | Publish Article #9 (Building the actor) to dev.to | A |
| 7 | LinkedIn: technical write-up of article #9 | C |
| 8 | Quote-tweet thread origin (already calendared for 2026-05-22) | B |
| 9 | Submit awesome-apify PR | G |
| 10 | Re-run Reddit harvest, refresh data in articles | H |

After Day 10: the daily-loop script self-picks from the menu based on:
- Time since last action in same category (cooldown)
- Past lift result (higher-lift categories prioritized)
- Yorick's queue (if he marks any "ready to ship", those bump up)

## Files

- `state/revenue-log.jsonl` — daily revenue snapshot (appends one line/day)
- `state/action-log.jsonl` — every action executed + measured lift
- `state/action-queue.json` — current queue + cooldowns
- `state/loop-state.json` — `{paused: bool, day_count: N, last_run: ISO}`
- `daily-loop.js` — the script run by the scheduled task

## Decision rules

**If revenue stalls at $20/day for 14 days:**
- Pause non-Yorick actions
- Send Yorick a Task: "loop stalled, need: a) industry outreach pitches sent, b) LinkedIn DMs to dealers, c) YouTube shorts filmed"

**If revenue stalls at $30/day for 14 days:**
- Consider paid actor experiments ($5-10 budget):
  - Apify `product-directory-submitter` for backlinks
  - Apify `easy-indexnow` if Yorick verifies IndexNow on apify.com (unlikely)

**If revenue jumps suddenly:**
- Don't break what works. Reduce experiment cadence to 1 action/3 days. Just keep publishing data.

**If a single action drives clear lift (>$2/day for 3 consecutive days):**
- Mark "winning play" in `state/winning-plays.md`. Repeat the same format with different content.

**Time-bound expectations:**
- Realistic ramp: $17/day → $30/day in 30 days → $50/day in 60-90 days
- Optimistic ramp: $50/day in 30 days if one article goes viral
- Pessimistic ramp: $50/day in 120+ days if all promotion is incremental

## What Yorick must do (cannot be automated)

| Action | Frequency | Owner |
|---|---|---|
| Approve scheduled task to run | one-time | Yorick |
| Paste reddit-blitz posts manually | day 5-7 | Yorick |
| Send outreach emails from his Gmail | weekly | Yorick |
| Film YouTube shorts (his voice/face) | weekly | Yorick |
| Verify Apify affiliate code `8fp2od` pays | one-time | Yorick |
| Sign up for Beehiiv/Substack newsletter (account creation prohibited for me) | one-time | Yorick |

## Communication protocol

The loop sends Yorick a brief status update only when:
- Revenue crosses a $5/day threshold (every $5 lift = +1 update)
- An action requires Yorick to act (Reddit post, email, shorts)
- The loop pauses or hits a warning condition
- The goal is met (one big celebration message)

Otherwise: silent. The state files are the source of truth.
