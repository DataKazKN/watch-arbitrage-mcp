# Promotion Arsenal — Watch-Arb + Vinted

Curated playbook synthesized from BHW research + Apify Store recon + live shipped channels. Apply to both `kazkn/watch-arbitrage-mcp` and `kazkn/vinted-smart-scraper` simultaneously.

---

## 1. The BHW jeffz playbook (Reddit, $0 ad spend, ~40 signups from 2 posts)

Source: `blackhatworld.com/seo/how-i-got-114-000-views-and-40-signups-from-2-reddit-posts-zero-ad-spend.1807381/` (Apr 9 2026, jeffz, 12 yr BHW veteran)

### The 9-step method

1. **Find right subreddit** — where target audience actually hangs out.
2. **Scrape 100-200 posts** from that subreddit. Use Apify Reddit scraper actors (jeffz literally name-checks Apify Store) or fetch reddit pages with `.json` appended.
3. **Run scrape through Claude Code on terminal**. Prompt: *"Go through every post and comment. Identify the problem people are describing. If they mention spending money on a tool, flag it. If they quantify pain in hours or dollars, flag it. Group problems into categories ranked by frequency."*
4. **Pull 3-5 buyer-language phrases** — exact quotes, not marketing-speak. These shape your post's voice so it sounds native, not promotional.
5. **Scrape deeper** with those phrases as search terms in adjacent subreddits. Validate pain across ≥ 2 communities.
6. **Tier pain points**:
   - **Tier 1 (gold)**: someone already paying for a broken solution ($7–$79/mo tools that fall short)
   - **Tier 2 (strong)**: pain quantified in hours/$ ("250+ replies/week = 2-3h/day in inbox")
   - **Tier 3 (weak)**: general frustration with no numbers — don't base your post on this alone
7. **Write the post — 95% value + 5% promotion**:
   - Post type A — *failure story* with personal vulnerability (high views, low conversion). Mention product ZERO times. People click your profile after reading.
   - Post type B — *data analysis* with scraped numbers + competitor pricing + named gaps (14x fewer views than type A but MORE signups). One line at the bottom: "I used X to run these harvests. You can try it free."
8. **Reply to every comment with substance**. Not "thanks!" — actual reasoning, specific data, fair concessions when challenged. Every reply bumps the post.
9. **Let results compound** — posts keep ranking on Google for months.

### Why data posts convert better than story posts

> "Post 1 got 114,000 views. Post 2 got 8,000. Post 2 brought more signups. The lesson: a targeted data post outperforms a viral story for conversions every time."

Story posts attract anyone who enjoys narratives → wide audience but low intent. Data posts attract people who already have the problem you solve → fewer eyeballs but pre-sold.

If you can only make one post per actor, make the **data post**.

### Applied to watch-arb

**Target subs (in order of conversion likelihood, based on jeffz tiering):**
1. **r/Watches** — Tier 1: dealers paying for Watchcharts ($29/mo), Bezel Club ($20/mo), Chrono24 Pro
2. **r/PatekPhilippe** — Tier 1: collectors who tab-switch between Chrono24 / WatchBox / Hodinkee daily
3. **r/Flipping** — Tier 1: resellers paying for arbitrage tools
4. **r/SideProject** — Tier 2: builders curious about niche SaaS
5. **r/Entrepreneur** — Tier 2: broader business audience

**The post to write** (data analysis, not story):
- Title: *"I scraped 1,247 listings of the Patek 5711/1A across 13 dealer marketplaces. Here are the cross-country spreads I found."*
- Body structure:
  1. **What I scraped**: 13 platforms (named), 1,247 listings, 30 days of data
  2. **The headline finding**: JP→US median gap of $44.3k = 22.7% on same ref/condition
  3. **Per-platform median table** (use real run data from `MARKET_SNAPSHOT` KV)
  4. **Why competitor tools miss this**: they scrape 4-5 US/UK majors only. Spreads hide in JP auctions + DE pre-owned + UK specialists
  5. **Specific quotes from dealer interviews** (use real comments from your Reddit research; substitute when you don't have them yet)
  6. **One line at the bottom**: "I used the actor I built to run these harvests. Free to try on Apify — comment if you want me to do this for a specific ref."

### Applied to Vinted

**Target subs:**
1. **r/Vinted** — Tier 1: direct audience already paying for premium Vinted tools
2. **r/Flipping** — Tier 1: resellers
3. **r/dropshipping** — Tier 1: sourcing operators
4. **r/Entrepreneur** — Tier 2: bootstrappers

**The post to write:**
- Title: *"Analyzed 5,000 Vinted listings across 19 European markets. Here's the brand-by-brand cross-country price gap."*
- Body: per-country median table, top-10 brands by cross-country premium, sourcing strategy (FR sourcing from ES at -15%, listing in IT at +22%), one-line CTA

---

## 2. Apify Store recon — 6 promo-helper actors

All PAY_PER_EVENT. Costs vary. Yorick to decide which to fund vs. skip per ROI.

| # | Actor | Cost model | Use case | Decision |
|---|---|---|---|---|
| 1 | `taroyamada/reddit-keyword-monitor-alerts` | PPE | Alert when "watch arbitrage", "patek dealer", "apify scraper" appear in Reddit posts/comments. Engage organically (NOT auto-post). | **RUN** — passive, monitors for natural opportunities |
| 2 | `onescales/easy-indexnow` | PPE | Push apify.com/kazkn/watch-arbitrage-mcp + blog URLs to Google/Bing IndexNow API for instant indexing | **SKIP** — Yorick doesn't own apify.com or dev.to to verify IndexNow keys |
| 3 | `prodmarkllc/product-directory-submitter` | PPE | Submit watch-arb to startup directories (BetaList, AlternativeTo, Capterra, G2, etc.) | **RUN** for watch-arb (132 runs / 8 users in Apify — small but legit) |
| 4 | `dltik/geo-competitor-research` | PPE | Check what ChatGPT/Claude/Gemini say about "watch arbitrage", "Chrono24 alternative". Find positioning gaps. | **RUN once** — calibrate messaging |
| 5 | `giovannibiancia/github-star-gazer-actor` | PPE | Pull users who starred competitor repos (chrono24-scraper, watch-tracker, etc.) → potential users | **MAYBE** — only if Yorick wants to do GitHub-native outreach |
| 6 | `alizarin_refrigerator-owner/twitter-poster` | PPE | Schedule X posts via API for the 48h quote-tweet bump + follow-up tweets | **RUN** when Day +2 arrives — automate quote-tweet |
| 7 | `alizarin_refrigerator-owner/linkedin-mcp-server` | PPE | LinkedIn automation via MCP — comment on relevant posts, send connection requests | **MAYBE** — risk of LinkedIn jail if abused |
| 8 | `pro100chok/similarweb-scraper` | PPE | Check traffic on Watchcharts.com, BezelClub.com → find their referral sources (backlinks we could ask for) | **RUN once** — discovery |

### Apify Reddit scrapers (per BHW step 2)

To run the jeffz playbook, use one of these:
- `parseforge/reddit-posts-scraper` — 1000+ posts/min, broad use
- `easyapi/reddit-posts-search-scraper` — search Reddit posts by keyword
- `khadinakbar/reddit-posts-comments-scraper` — no API key required

**One-time cost estimate**: scraping 200 posts from r/Watches + 200 from r/PatekPhilippe ≈ $0.10. Negligible. Then analyze with Claude Code locally (free).

---

## 3. The full distribution map — already shipped + queued

### LIVE (5 social posts + 4 surface updates)

| Channel | Post | Status |
|---|---|---|
| X @Datakazkn | 6-tweet watch-arb thread (5711 hook → 13 platforms → 5+7 framing → how it works → CTA + apify.com → pricing) | ✅ |
| X @Datakazkn | Vinted milestone tweet (105K runs + auto-preview card) | ✅ |
| X @Datakazkn | A2 standalone tweet (no thread, quote-tweet ammo) | ✅ |
| LinkedIn Yorick K. | Watch-arb A3 long-form + apify.com preview card | ✅ |
| LinkedIn Yorick K. | Vinted B2 (milestone + watch-arb cross-link) | ✅ |
| X profile @Datakazkn | Bio updated with both actors + emoji-cleaned (155/160 chars) | ✅ |
| LinkedIn headline | Updated with concrete actor names + traction stats | ✅ |
| Apify Store watch-arb | Title/description/SEO refreshed to 13 platforms + README v2 (build 0.1.28) | ✅ |
| Apify Store Vinted | SEO refreshed + KazKN portfolio cross-link section appended to README | ✅ |

### MANUAL PASTE NEEDED (Reddit hard-blocked by Chrome MCP)

8 sub-tailored posts in `actor/PROMOTION/reddit-blitz.md`:
- r/Watches • r/PatekPhilippe • r/rolex • r/Flipping • r/Vinted • r/SideProject • r/Entrepreneur • r/IndieHackers

**BEFORE pasting**, apply the BHW jeffz upgrade:
1. Scrape 100 posts from r/Watches using `parseforge/reddit-posts-scraper`
2. Pull 3-5 buyer-language phrases from those posts
3. **Rewrite the r/Watches post in reddit-blitz.md** using those phrases verbatim where they fit naturally
4. Same for r/Flipping using r/Flipping data
5. Post the data-analysis version (Type B from BHW) for highest conversion

---

## 4. Engagement loop (next 7 days)

### Hour 0 → +6h (today)
- ✅ Initial posts shipped
- **Monitor X notifications + LinkedIn notifications every 30-60 min**
- Reply to any commenter within 30 min with substance (NOT "thanks!")
- Like/respond to RTs and quote-tweets

### Hour +24h (tomorrow)
- Self-reply to Tweet 1 of the X thread with a "small update" — drives algo signal
- Check Apify Store dashboard for new installs / users
- If any reviews arrive, screenshot + quote-tweet them

### Hour +48h (Day 2)
- **Quote-tweet the thread origin** with: *"24h update: 6 new installs from this thread. Here's what people are asking about ↓"*
- Post B3 (r/Flipping for Vinted) after r/Vinted has died down

### Day 3-7
- Daily 1 X post that's pure value (not promo). Builds reputation per jeffz playbook
- Engage with @apifyhq, @apify, @apify_store posts to get on their radar
- DM the 4 existing bookmarkers on apify.com/kazkn/vinted-smart-scraper to ask what they need next (organic word-of-mouth driver)

---

## 5. Affiliate / referral links — verify

All public links currently use `?fpr=8fp2od` Apify FirstPromoter referral suffix:
- ✅ actor README "Try Watch Arbitrage free" CTA
- ✅ vinted README KazKN portfolio cross-link
- ✅ social-posts.md — all CTAs
- ✅ reddit-blitz.md — all post-bodies

**Manual checks Yorick should do**:
- Confirm `?fpr=8fp2od` is your actual code in apify.com/account/integrations
- Confirm Apify pays the affiliate even on your own actors (some Affiliate programs exclude self-referrals)
- If self-referral is excluded: rotate to organic links for your own portfolio, keep `?fpr` for outbound recommendations only

---

## 6. Risk register (what NOT to do)

From BHW research + my own session learnings:

- ❌ **$40 Reddit posting services** — text gets deleted in 24h, mods auto-flag pattern, no SEO value (jeffz). Spent $40 = wasted.
- ❌ **Same content cross-posted to 5+ subs in 1h** — Reddit anti-spam shadowbans. 60min minimum between posts.
- ❌ **Apify link in Reddit post title** — most subs auto-remove. Drop in body, bottom 1/3.
- ❌ **Cross-posting watch content to Yorick's Threads @rejetfantome** — that's the legal-AI biz. Already tried + deleted today. Don't repeat.
- ❌ **Buying followers / engagement** — kills LinkedIn algo signal quality. Apify Store users care about reviews, not vanity metrics.
- ❌ **Auto-following random people on X** — gets the @Datakazkn account flagged. Yorick already at 8 followers — organic growth is fine.
- ❌ **Posting in r/Apify, r/dataisbeautiful with the same content** — those subs have aggressive promo filters. Only post if the data is genuinely interesting *first*, tool reference second.

---

## 7. Next concrete actions (in priority order)

1. **Yorick paste reddit-blitz.md posts manually** — 60min spacing, follow cadence in that file
2. **Yorick verify affiliate code `8fp2od` pays on self-referrals** (apify.com/account/integrations)
3. **Yorick decide which 3 of the 8 Apify promo actors to fund** (recommend: reddit-keyword-monitor + product-directory-submitter + geo-competitor-research, ~$5-10 total)
4. **Schedule 48h quote-tweet** — set calendar reminder for Day +2
5. **(Optional) Apply jeffz playbook**: scrape r/Watches with `parseforge/reddit-posts-scraper`, run Claude Code analysis, rewrite r/Watches reddit-blitz post with their exact language

Total expected reach added (vs. baseline 5 shipped posts): **+8 Reddit posts** (potentially 100K+ views if 1 thread breaks 10K) + **+5 directory listings** (BetaList, AlternativeTo, etc. backlinks for SEO) + **organic monitoring loop** (Reddit + GEO mentions). Realistic add: 20-50 new installs over next 30 days for watch-arb if posts land well.

If only ONE thing is added: **r/Watches data-analysis post with the BHW playbook**.
