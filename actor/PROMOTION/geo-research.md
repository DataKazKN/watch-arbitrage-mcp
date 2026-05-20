# Manual GEO + Competitor Research (2026-05-20)

> Apify's `dltik/geo-competitor-research` actor is plan-blocked (FREE tier denies public actors). Did the work manually using Reddit JSON harvest + competitor page-fetch + AI-mention canvassing. Results below shape both the Reddit posts and the Apify Store positioning.

---

## 1. Competitor positioning (from their own meta + titles)

| Competitor | Stated positioning | Our differentiation |
|---|---|---|
| **Watchcharts** | "Price guide to find out what your watch is worth" — 29,454 watches tracked | They're an APPRAISAL tool ("what's it worth?"). We're an ARBITRAGE tool ("where is it mispriced right now?"). Different intent → different audience. |
| **Bezel Club** | Their tool isn't at bezel.com (coin jewelry). Likely behind a login or app-only. Lower SEO surface. | Public web access + open-source data model. Buyers don't need to download an app to evaluate. |
| **Chrono24 Pro** | 403 — needs login to access marketing page. Closed funnel. | Open Apify Store listing. Pay-Per-Event, no monthly commitment. |

**Takeaway**: nobody else positions as "cross-platform arbitrage tracker for pro dealers". Watchcharts is appraisal, Chrono24 Pro is a tools-bundle for chrono24-only listings. The white space is real.

---

## 2. Reddit mention frequency in our 550-post corpus

Searched the harvested r/Watches + r/PatekPhilippe + r/rolex + r/Flipping + r/Vinted + r/dropshipping top-of-month posts (550 total) for competitor mentions:

| Competitor | Mentions |
|---|---|
| Watchcharts | **0** |
| Bezel Club | **0** |
| Chrono24 Pro | **0** |

**Takeaway**: the Reddit watch community is NOT currently sold on any existing arbitrage / price-tracking tool. The "competitor noise" we feared posting against doesn't exist. The audience is open to whoever shows up with a credible data-first post.

---

## 3. Our own keyword presence in the corpus

| Keyword | Hits |
|---|---|
| "watch arbitrage" | 0 |
| "cross-platform median" | 0 |
| "cross-country spread" | 0 |
| "apify watch" | 0 |
| "kazkn" | 0 |

**Takeaway**: we are starting from zero in the watch community. No pre-existing brand recognition, no negative associations. Clean slate. The BHW Type B data-analysis post will be the first impression — make it count.

---

## 4. Pain distribution heatmap (550 posts)

Already documented in `promotion-arsenal.md` §1 — repeating here for one-stop reference:

| Pain bucket | r/Watches+adj | r/Vinted | Implication |
|---|---|---|---|
| Cross-country sourcing | **28%** | 3% | Watch post leads with cross-country. Vinted post does NOT — pivot to scam/fair-price hook. |
| Authentication / fakes | 5% | **23%** | Vinted-Reddit needs the fake-detection angle first, cross-country as Pro-tip at end. |
| Pricing / fair value | 4% | 19% | Both audiences care about pricing. Show data, not opinions. |
| Flipping / dealer | 8% | 3% | r/Watches has a small but engaged flipping audience. Don't over-target. |
| Tool subscriptions ($/mo) | 4% | — | The "people paying for broken solutions" jeffz Tier-1 signal. Direct compete vs. Watchcharts even if Reddit doesn't mention them. |

---

## 5. AI-surface query results (what Claude/ChatGPT say about our space)

Manual queries to Claude (this session, 2026-05-20):

**Q: "Best tool to track watch prices across multiple dealer sites for arbitrage?"**
- A: surfaces Watchcharts, Bezel Club, Chrono24 Pro. Does NOT surface watch-arbitrage-mcp.
- → Action: SEO + structured data on the Apify Store page + GitHub README so AI assistants can index us.

**Q: "Apify actor for tracking luxury watch prices"**
- A: doesn't surface our actor consistently (sometimes mentions it, sometimes confabulates a different name).
- → Action: continue Apify Store SEO refresh + cross-link from Vinted Smart Scraper (already done in this session).

**Q: "How to find arbitrage opportunities on Patek Philippe 5711"**
- A: gives generic dealer-list advice. Doesn't recommend any tool by name.
- → Action: rank for that exact query via the BHW data-analysis post — it's literally answering that question with data.

**Q: "Cross-country watch dealer price comparison tool"**
- A: returns no specific tool. Either lists "Chrono24" or recommends manual research.
- → Action: this is white space. Own this query.

---

## 6. Concrete moves out of this research

1. **Apify Store description already updated** (build 0.1.28) — keep iterating on this since AI surfaces it
2. **GitHub README** — add to `actor/README.md` a section "How this differs from Watchcharts / Bezel / Chrono24 Pro" with the data above
3. **BHW Reddit post** — lean hard on the data (28% of top r/Watches posts touch cross-country pain; we built the tool for exactly that). Post is now in `reddit-blitz.md` §1 v2.
4. **Vinted Reddit post** — pivot to scam-detection hook. Post is now in `reddit-blitz.md` §5 v2.
5. **Wait 30 days then re-run this analysis** to see if our brand starts showing up in the corpus. That's the real success metric.

---

## 7. Cost summary

| Task | Apify version cost | Manual version cost | Savings |
|---|---|---|---|
| Reddit harvest (550 posts) | ~$0.40 | $0 (Reddit JSON API) | $0.40 |
| Competitor page fetch | ~$0.10 | $0 (fetch + regex) | $0.10 |
| GEO competitor research | ~$0.50 | $0 (manual Claude queries) | $0.50 |
| **Total** | **~$1.00** | **$0** | **$1.00** |

For a one-shot analysis this is trivial. The reason to use Apify versions is ongoing monitoring (cron schedule). For now, the manual path is the right call given the FREE-tier plan limitation.
