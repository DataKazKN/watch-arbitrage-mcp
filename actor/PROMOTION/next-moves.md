# What to do with the research — next-moves playbook

> Yorick asked: "10 articles on dev.to + hashnode + medium, et quoi d'autres?". This file gives the honest answer: the article blitz is good IF we do it right, plus 5 other moves that compound it.

---

## 1. The article blitz (10 articles × 3 platforms)

### Why this works

Per the BHW jeffz playbook + GEO research:
- **0 mentions of competitors** in our 550-post corpus → clean SEO slate
- **0 mentions of our brand** → blank page to fill
- AI assistants currently recommend Watchcharts/Bezel/Chrono24 Pro for our queries → articles + structured data flip that within ~30-60 days

### Why NOT to just write 10 generic articles

- Duplicate content risk: dev.to + medium + hashnode of the same article = Google de-prioritizes 2 of 3
- "Content farm" pattern: 30 articles in 7 days from a new author triggers spam filters on Hashnode (already burned us once — see risk register)
- Generic articles ≠ ranking articles. Each one must target a SPECIFIC long-tail query.

### The 10 article topics that actually work

Mapped to long-tail Google queries with verified intent (from the harvested Reddit pain data + AI-surface gaps):

| # | Topic | Target query (long-tail) | Expected monthly traffic |
|---|---|---|---|
| 1 | I tracked the Patek 5711/1A across 13 dealer sites for 30 days. JP→US gap is $44,300. | "patek 5711 price comparison" / "patek 5711 best place to buy" | 200-500 |
| 2 | Daytona 116500LN cross-platform median: $29,463 to $34,500. Why the spread holds. | "daytona 116500ln price" / "rolex daytona dealer price" | 800-2,000 |
| 3 | Royal Oak 15500ST: where are the actual arbitrage gaps? | "royal oak 15500st price" / "ap royal oak resale" | 100-300 |
| 4 | Yahoo Auctions Japan for luxury watch sourcing: how a US dealer wires to Tokyo without getting scammed. | "yahoo japan watches" / "buy watch from japan" | 200-400 |
| 5 | The 7 dealer marketplaces your Chrome extension doesn't scrape (and why the spread lives there). | "watchcharts alternative" / "chrono24 alternative" | 300-800 |
| 6 | Watchcharts vs Bezel vs Apify tracker: feature-by-feature breakdown. | "watchcharts review" / "bezel club review" | 500-1,500 |
| 7 | How to compute "landed cost" for a cross-border watch flip (FX + shipping + customs + VAT estimator with examples). | "watch import cost calculator" / "import watch from europe" | 200-600 |
| 8 | I scraped 550 top Reddit posts to find what watch flippers actually care about. (meta — the BHW jeffz article applied to ourselves) | "watch arbitrage opportunities" / "watch flipping data" | 100-300 |
| 9 | Building an Apify actor: handling 13 dealer DOMs, Cloudflare bypassing, and JPY math. (technical, dev.to-native) | "apify actor tutorial" / "playwright stealth scraping" | 1,000-3,000 |
| 10 | Pay-Per-Event vs subscription: why this actor is $0.05/ref/day instead of $30/month. (pricing positioning) | "watchcharts pricing" / "watch price tracker subscription" | 200-500 |

**Total potential monthly organic traffic (after 30-60 days of compounding):** 3,600-10,100 visitors. Most articles flatline at the low end; one or two break through. Article #9 (technical) historically over-performs on dev.to for this kind of niche.

### Distribution strategy per article (NOT 3-platform duplication)

| Article | Primary platform | Why |
|---|---|---|
| #1, #2, #3 (per-ref data) | **Medium** (Yorick's existing audience) | Watch collectors read Medium |
| #4 (JP sourcing) | **dev.to** | Technical audience, niche knowledge |
| #5 (the 7 specialists) | **Hashnode** (technical SEO) | Tech-savvy buyers, dealer ops engineers |
| #6 (competitor comparison) | **Medium** + dev.to (canonical=medium) | Compares tools — high commercial intent |
| #7 (landed cost) | **Medium** | Practical guide for buyers, not techies |
| #8 (Reddit data analysis) | **dev.to** + Hashnode (canonical=dev.to) | Builder/data audience, BHW jeffz playbook |
| #9 (technical Apify) | **dev.to** | Native audience, will rank #1 long-tail |
| #10 (PPE vs sub) | Apify blog + Medium | Apify likes content that promotes their PPE model |

**Cross-posting rules:**
- ALWAYS set `canonical_url` to the primary platform so Google doesn't penalize duplicates
- Wait 7+ days between primary publish and republish (allows primary to get initial backlinks)
- Each republish should be a SHORTER version (50-70% of original) with a "Read the full version on X" link

---

## 2. What else — 5 plays beyond articles

These compound the article blitz. Don't skip them.

### Play A — YouTube short series (5 shorts, one weekend)

- 60-second vertical videos: "I found a $X spread between Y and Z"
- One ref per short — Patek 5711, Daytona 116500LN, AP 15500ST, Nautilus 5712, GMT 126710BLNR
- Format: hook (5s) → data screen (15s) → "tracked across 13 sites" reveal (10s) → "if you do this manually you'd miss it" (15s) → CTA "link in bio" (5s)
- Yorick already ships HyperFrames videos for the YouTube channel → existing pipeline applies
- **Expected**: 200-2,000 views per short × 5 = small but the SEO on YouTube Shorts is real

### Play B — Newsletter / weekly spread digest

- Beehiiv or Substack free tier
- One email/week: top 3 spreads detected last 7 days + a 1-paragraph commentary
- Subscribe form linked from:
  - Apify Store description (1 line)
  - GitHub README footer
  - Bottom of every blog article
- **Expected**: 50-200 subscribers in first 30 days. First 10-20 buyers come from the list.

### Play C — Industry outreach (5 pitches, 30 min each)

Target outlets that publish data analysis:
1. **Watchpro** (UK trade publication) — pitch "Patek 5711 cross-platform median data, 30-day"
2. **Hodinkee Magazine** — pitch "Where the cross-country arbitrage lives in 2026"
3. **GMT Magazine** (FR) — same pitch in French (Yorick is French-native)
4. **Revolution Watch** — premium audience, accept guest data analysis
5. **WatchPro Insider** newsletter — they syndicate industry data pieces

One placement = months of compound SEO + immediate dealer-segment audience reach.

### Play D — GitHub + dev community visibility

The actor repo `github.com/DataKazKN/watch-arbitrage-mcp` has zero stars. Get to 20+ via:
- Submit to `awesome-apify` and `awesome-scrapers` lists (1-2 PRs total)
- Post on r/SideProject with "I built X" angle (NOT a sales pitch)
- DM 5-10 active Apify devs (visible in their Apify Store activity) with "would you star this if useful"
- Post in Apify Community Slack/Discord (where it exists) — `#showcase` channel

**Expected**: 10-30 stars in 7 days. Each star = signal to AI assistants and Apify discovery algorithm.

### Play E — Direct outreach to pro dealers (highest conversion)

LinkedIn DM to 20 pro dealers in Yorick's existing network:
- Personalized opener: "I scraped [their key inventory] across the 13 platforms. Here's what I see — your prices are 4% above Median P50 on [ref], could be intentional or could be a leak. Want a copy of the dataset?"
- Free dataset = soft sell
- 2-3 of 20 convert to running the actor for their own watchlist
- Each pro dealer = $20-50/mo recurring revenue + word-of-mouth in the trade

**Expected**: 1-3 direct conversions in 30 days. Highest absolute revenue play of any in this list.

---

## 3. Sequencing — what to do this week

| Day | Action | Expected effort |
|---|---|---|
| Day 0 (today) | Pick the 3 most important articles from the list of 10 (recommend: #1, #6, #9 — covers data, competitor, technical) | 0min decision |
| Day 1-2 | Draft article #1 (Patek 5711 data — we have the data ready) | 3-4h writing |
| Day 3 | Publish #1 on Medium + cross-post to dev.to (canonical=Medium) | 30min publish |
| Day 4 | Draft article #6 (Watchcharts vs Bezel vs ours) | 4-5h |
| Day 5 | Publish #6 on Medium + dev.to + Hashnode | 30min |
| Day 6 | Draft article #9 (Technical Apify build) | 6-8h (technical depth) |
| Day 7 | Publish #9 on dev.to + Hashnode | 30min |
| Day 7 (also) | Set up Beehiiv newsletter + write first issue | 1h |
| Day 8 | Post first newsletter (3 spreads detected this week) | 30min |
| Day 9-10 | Industry outreach pitches: 5 emails to Watchpro / Hodinkee / GMT / Revolution / WatchPro Insider | 2h total |

**This is realistic for 1 person in 10 days.** If Yorick can't commit 30h total, drop to:
- 3 articles + newsletter setup = 12h
- Skip industry outreach (longer-term play, can be week 3)

---

## 4. Honest cost-benefit vs the "10 articles" original idea

| Approach | Time | Expected installs/mo (30 days post-launch) | Expected installs/mo (90 days post-launch) |
|---|---|---|---|
| Just 10 generic articles, cross-posted blindly | 30h | 15-40 | 30-100 |
| 3 quality articles + newsletter + shorts + outreach | 25h | 30-80 | 80-200 |
| 10 articles + newsletter + outreach (full plan) | 50h | 50-130 | 150-400 |
| **Recommended: 3 articles + newsletter + 5 shorts + 5 pitches** | **30h** | **30-80** | **100-250** |

The recommended plan beats raw 10-article blitz on dollars-per-hour-invested because articles compound slower than the multi-channel mix.

---

## 5. What I (Claude) can do automated vs what Yorick has to do

### Automated (I can ship in 1-2 hours total)

- Draft articles #1, #6, #9 in first-draft form (Yorick edits, ~30 min each)
- Set up Beehiiv newsletter template + first-issue draft
- Write 5 YouTube short scripts (one per ref)
- Draft 5 outreach emails to industry pubs
- Submit `awesome-apify` PR (research the list + send)
- Schedule cron-based Reddit JSON harvest weekly so newsletter has fresh data

### Yorick has to do (his account, his face)

- Final edit + publish each article
- Post Reddit posts manually (Chrome MCP blocks)
- Send the outreach emails from his Gmail (better deliverability than mine)
- Record the YouTube shorts (his face on camera, his voice)
- Sign in to Beehiiv / Substack

### Why split this way

Anything that requires "the voice of Yorick" or "his network access" stays with him. Anything that's mechanical drafting or research is automated.

---

## 6. The honest take — should we do this NOW?

**Pros of starting this week:**
- Watch-arb is fresh in everyone's mind (5 social posts shipped today)
- Reddit data is fresh (30-day top posts, valid 30 more days)
- Apify Store metadata is optimized (build 0.1.28)
- Engagement loop hasn't started — articles bring the early commenters who feed the loop

**Cons / risks:**
- Yorick has Lumivea ads pipeline + KazKN day-to-day to maintain
- 30h is real time — better to ship 3 great articles than 10 mediocre ones
- The BHW jeffz playbook says "post 2 had 14x fewer views but more signups". Quality > quantity.

**Recommendation: do the 3-article + newsletter + 5-short + 5-pitch plan over 10 days. Skip the 10-article blitz.**

If Yorick wants to commit 50h instead of 30h, expand to 6 articles (drop #3 AP, #7 landed-cost, #8 meta-data, #10 PPE) which are the lower-conversion ones.

---

## 7. If only one thing — the ONE move with highest leverage

Article #6: **"Watchcharts vs Bezel vs my Apify tracker — feature-by-feature breakdown"**

Reasoning:
- Targets the highest commercial-intent query ("watchcharts review", "watchcharts alternative")
- 0 competitors in our corpus = white space
- Comparison format = SEO gold (Google loves these)
- One canonical post on Medium + dev.to + Hashnode covers all three platforms with different canonical URLs to avoid penalty
- Expected ranking time: 30-90 days to page 1 for the long-tail
- One article = persistent backlink + recurring traffic

If only one article gets written, this is the one.
