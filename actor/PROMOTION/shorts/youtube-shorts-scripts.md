# 5 YouTube Short scripts (60s vertical, 9:16) — Yorick films

Same beat pattern across all 5:
- **0-3s**: HOOK (number on screen + voice "$X spread")
- **3-15s**: SETUP (which ref, what platforms)
- **15-40s**: DATA REVEAL (per-platform median table animated)
- **40-55s**: THE WHY (one-line insight)
- **55-60s**: CTA "link in bio" + apify.com/kazkn end card

Yorick films one or two per weekend; pipeline already exists via HyperFrames + the existing `/Users/kinderbb/workspace/5711-spread-map-video/` infrastructure.

Filming tips:
- Show numbers on screen, not just spoken. YouTube Shorts pause for screenshots.
- First frame should have the dollar amount visible (algo loves number-led hooks).
- Skip the "hi everyone" intro. Cold open with the spread.

---

## Short 1 — Patek 5711/1A (the launch hook)

**ON-SCREEN HOOK (0-3s)**: "$44,300 spread."

**VOICE (0-3s)**: "I just found a $44,300 spread on the Patek 5711."

**VOICE (3-15s)**: "Same reference. Same week. Same condition class. Yahoo Auctions Japan median was $148,200. The US median was $192,500."

**ON-SCREEN (15-40s)**: animated per-platform table:
- Yahoo Japan: $148,200
- Chrono24 EU: $174,800
- H. Spliedt (Munich): $179,200
- A Collected Man (London): $186,400
- Bob's / WatchBox / European Watch / Analog:Shift (US): $192,500

**VOICE (15-40s)**: "I track this reference across 13 dealer marketplaces. The gap doesn't close. It's persistent."

**VOICE (40-55s)**: "If you only watch the 5 US-UK majors, you're missing this. The spread lives in the 7 platforms most Chrome extensions don't scrape."

**ON-SCREEN END CARD (55-60s)**: "apify.com/kazkn — link in bio. Free to install. $0.05/ref/day."

---

## Short 2 — Daytona 116500LN

**ON-SCREEN HOOK (0-3s)**: "$5,000 between identical Daytonas."

**VOICE (0-3s)**: "The same Daytona 116500LN sold for $29,463 on Chrono24 and $34,500 on European Watch Co. Same week."

**VOICE (3-15s)**: "Same ref. Same condition class. Just different dealer pricing strategies."

**ON-SCREEN (15-40s)**: animated bar chart:
- Chrono24 (TR seller, papers-only): $29,463
- WatchBox (full-set + warranty): $29,646
- Bob's Watches: ~$30,500
- Watchfinder UK: ~$32,000
- European Watch Co (Boston, full-set + 2yr warranty): $34,500

**VOICE (15-40s)**: "The cheap end is mostly papers-only. The dear end is full-set with dealer warranty. But the gap is 17%, much wider than the actual papers premium."

**VOICE (40-55s)**: "Cross-reference paperwork + dealer reputation. There's a real $1500-2000 to make here for a savvy intermediary."

**END CARD (55-60s)**: same as Short 1.

---

## Short 3 — Royal Oak 15500ST

**HOOK (0-3s)**: "The AP spread you can actually trust."

**VOICE (0-3s)**: "AP Royal Oak 15500ST has the tightest spread of the big-3 sports references. ~8%, P10 to P90."

**VOICE (3-15s)**: "Why? AP supply is thinner. Dealers price more aggressively against each other. The gap closes faster."

**ON-SCREEN (15-40s)**:
- P10: $48,200
- Cross-platform median (P50): $52,400
- P90: $57,100
- Cross-country gap: marginal (~3% US vs UK)

**VOICE (15-40s)**: "If you trade the Royal Oak, you don't need cross-country arbitrage. You need real-time alerts on when a single dealer flips inventory below market."

**VOICE (40-55s)**: "That's what threshold alerts are for. Set 5% below median and you'll get pinged on Telegram when it happens."

**END CARD (55-60s)**: same.

---

## Short 4 — GMT-Master II 126710BLNR (Pepsi)

**HOOK (0-3s)**: "The Pepsi GMT is a 4-source signal, not 13."

**VOICE (0-3s)**: "The 126710BLNR Pepsi reads thin on most platforms. WatchBox, Bob's, Watchfinder, European Watch. After that, sample sizes drop fast."

**ON-SCREEN (15-40s)**:
- WatchBox: $24,500 (full-set, 1yr)
- Bob's: $23,800 (papers, no box)
- Watchfinder UK: $24,200
- European Watch Co: $26,900

**VOICE (15-40s)**: "Spread is ~13%, but most of it is the warranty/papers premium. The actual mispricing window is narrow."

**VOICE (40-55s)**: "Lesson: not every reference has cross-country arbitrage. The Pepsi is too liquid. Hunt the less-liquid references for the wider gaps."

**END CARD (55-60s)**: same.

---

## Short 5 — Nautilus 5712 (the underrated one)

**HOOK (0-3s)**: "The 5712 spread nobody talks about."

**VOICE (0-3s)**: "Patek Nautilus 5712 — the steel power-reserve, moonphase, sub-seconds variant. Often overlooked next to the 5711."

**ON-SCREEN (15-40s)**:
- Yahoo Japan median: $98,400
- Chrono24 EU median: $116,200
- US median: $129,800

**VOICE (15-40s)**: "The same JP-to-US gap exists on the 5712. ~24%. Wider than the 5711 because the audience for the 5712 is more niche, so the JP estate-sale dynamic is more pronounced."

**VOICE (40-55s)**: "If you're priced out of 5711s but still want Nautilus exposure, the 5712 is where you can still find a flip."

**END CARD (55-60s)**: same as Short 1.

---

## Distribution

- Each short: publish to YouTube Shorts + Instagram Reels + TikTok (same vertical 9:16 MP4)
- Cross-post to X as native video (X auto-trims to 2:20 max, fine)
- Add to a YouTube playlist "Cross-Platform Watch Arbitrage" so they cluster for the YT algo
- Caption every short with the same 3-line summary + apify.com/kazkn link

## Pipeline

Use the existing HyperFrames + Remotion pipeline at `/Users/kinderbb/workspace/5711-spread-map-video/`. The 5711 shorts already exist (a, b, c) and can be used as templates. New shorts:
- Copy `5711-en/` → `daytona-en/`, `royal-oak-en/`, `pepsi-en/`, `5712-en/`
- Replace per-ref data in the HyperFrames composition
- Render via existing `npm run render` pipeline
- 4 new shorts = ~6h work, can be done in one weekend block
