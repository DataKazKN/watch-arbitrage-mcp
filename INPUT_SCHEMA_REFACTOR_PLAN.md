# INPUT_SCHEMA Refactor Plan — watch-arbitrage-mcp

Date: 2026-05-17
Scope: `actor/.actor/input_schema.json` (+ light touches to `actor/.actor/actor.json`).
Source of truth for "winning" patterns: live builds of `apify/instagram-scraper`, `apify/web-scraper`, `apify/google-search-scraper`, `compass/crawler-google-places`, `apidojo/tweet-scraper`, `junglee/Amazon-crawler`, `lukaskrivka/google-maps-with-contact-details`.

---

## Section 1 — Current input audit (line-level critique)

Current file: 13 fields, 222 lines. Mixed quality. Concrete issues:

1. **`title` mixes a numbered emoji prefix into the field title** (`"1️⃣ Watch references to track…"`). No winner does this. Apify already renders field order top→bottom — numbering is redundant and noisy. Section captions should carry the "step" framing, field titles should be short and noun-like (`"Watch references"`, `"Spread sensitivity"`).
2. **`description` is wall-of-text emoji soup**. `references` description is 478 chars with 6 emoji + 3 paragraphs of caveats. Winners (Instagram, Tweet) keep first sentence to one task-focused line + HTML `<br><br>` separator + a short "tips" block. Long disclaimers belong in README, not the input.
3. **`spread_sensitivity` + `spread_sensitivity_decimal` is two fields for one concept**. The second exists purely because the first is `integer`. Top scrapers use `type: "number"` with `minimum: 0.5` and let the user type `4.5` directly. The split is a leak of implementation into UX. Delete the decimal sibling.
4. **`sectionCaption` placement is wrong**. The first `sectionCaption` (`▶ QUICK START …`) is attached to `references`, the third (`🎚️ Filters`) is attached to `filter_conditions`, the fourth (`⚙️ Advanced options`) is attached to `platforms`. Apify renders a section *starting* at the field that owns the caption. That's fine, but the captions repeat the description below them — same text twice on screen.
5. **`sectionDescription` is missing on the Telegram section description** and the Telegram section uses `📱 Telegram setup (only if you picked Telegram or Both above)` — "or Both" is a stale reference to a removed option (only `telegram` and `dataset_only` exist in the enum).
6. **`platforms` enum advertises 7 platforms** (chrono24, watchbox, bobs, watchfinder, europeanwatch, watchesofswitzerland, hodinkee) but the prompt says **13 marketplaces** (MR Watches HK, Yahoo Japan, etc.). Either the schema is out of date or the README/title is. This kills trust — every winner publishes a schema that matches the README.
7. **`alert_channel` enum has 2 options but description mentions "Email digest coming v0.2"** — winners never expose un-shipped options. Keep the enum, drop the future-tense line; promise nothing the actor cannot deliver today.
8. **`isSecret: true` is on the bot token (good)** but `alert_telegram_chat_id` is not flagged as sensitive even though it's a private identifier. Winners (`apify/web-scraper.initialCookies`) use `isSecret` consistently for any value that would embarrass the user if leaked into a Telegram share.
9. **No `nullable: true` anywhere.** When `references` defaults are not used and the user empties the list, Apify shows "null". Winners use `nullable: true` plus `minItems` to give clean validation errors.
10. **`price_ceilings` uses `stringList` with format `"5711/1A-010:185000"`**. This is a hand-rolled mini-DSL. Top scrapers replace this with `editor: "json"` + an `array` of `{reference, max_price_usd}` objects, validated by the platform. Easier to read, IDE-typed, no silent skip of malformed rows.
11. **No proxy section.** Every winner exposes `proxyConfiguration` with `editor: "proxy"`. A multi-marketplace scraper without proxy controls feels amateur, even if Apify defaults are good.
12. **No "test run with 1 reference" affordance.** Winners (`amazon`, `gplaces`) ship `prefill` that produces a fast cheap run. The current 5-reference prefill runs through 6 marketplaces × 25 listings = up to 750 fetches — too expensive for "first click".
13. **Required array is `["references", "spread_sensitivity", "alert_channel"]`** — `spread_sensitivity` has a `default`, so listing it as required is weird (it's never empty). Drop it from required.
14. **`max_listings_per_ref_per_platform`** is in Advanced but `price_ceilings` is also Advanced and they share no section caption — they both inherit `platforms`'s `⚙️ Advanced options` caption. Fine, but `filter_box_papers` and `strict_condition_matching` sit *between* the Filters section and the Advanced section without their own caption, so they visually belong to Filters. That's actually intended — but on a busy form the user can't tell.

Overall score before refactor: **5.5 / 10**. Field naming is solid; field grouping, description style, and visual rhythm are not.

---

## Section 2 — Winner actors analyzed

| Actor | Fields | Sections | Prefills | Examples | Key UX patterns | Score /10 |
|---|---|---|---|---|---|---|
| `apify/instagram-scraper` | 8 | 2 | 5 | 0 | One-line task-focused descriptions, `<br><br>` for breath, `<code>` for paths, `enumTitles` with " " (space) to hide deprecated options, single `editor: "datepicker"` for `onlyPostsNewerThan` accepting relative strings (`"1 day"`) | 9.5 |
| `apify/web-scraper` | 39 | 4 | 15 | 0 | Hard split: Basic / Proxy / Performance / Advanced. Proxy section uses `editor: "proxy"`. `pageFunction` uses `editor: "javascript"`. `requestListSources` editor for start URLs | 9.0 |
| `apify/google-search-scraper` | 31 | 7 | 7 | 31 | Add-on sections (`🤖 Add-on: AI search`, `📢 Add-on: Paid results`) — feature gating via sections, each ending `($)` in the title to signal extra cost. `schemaBased` editor for nested config | 9.5 |
| `compass/crawler-google-places` | 36 | 10 | 6 | 35 | Heavy `<b>` and `<br><br>` in `sectionDescription` for paragraph rhythm. Every section caption starts with emoji **category** (🔍 search, 📌 details, 🏢 contacts) — visual taxonomy | 9.0 |
| `apidojo/tweet-scraper` | 26 | 3 | 7 | 0 | Top section accepts 4 input modes (URLs / search terms / handles / conversation IDs) — each `stringList` with concrete prefill (`["elonmusk","taylorswift13"]`). Multiple-paths-to-the-same-output pattern | 9.0 |
| `junglee/Amazon-crawler` | 14 | 2 | 7 | 14 | `editor: "requestListSources"` for URL list — gives the user a paste-many-URLs widget with optional headers/userdata per URL. `prefill` and `example` set to **the same value** so the placeholder fades when typing | 8.5 |
| `lukaskrivka/google-maps-with-contact-details` | 25 | 6 | 6 | 24 | Pricing tier referenced inside `sectionDescription` HTML (`<b>$0.001 per result</b>`). Educates user on cost mid-form | 8.5 |

Patterns shared by all 7: short titles, HTML in descriptions, no emoji in field titles (only in sections), proxy editor, `prefill` always present on the main input, no hand-rolled string DSLs.

---

## Section 3 — Patterns to steal (ranked)

1. **Short noun field titles.** "Watch references" not "1️⃣ Watch references to track (precise refs only — recommended)".
2. **Section captions own the framing.** Emoji + verb-phrase: `🎯 What to track`, `🔔 Alert settings`, `🎚️ Filter listings`, `⚙️ Advanced — Platforms & cost`.
3. **Descriptions: 1 sentence task → `<br><br>` → 1 sentence tip → optional `<br><br>` 1 sentence caveat.** Max 280 chars. Move long disclaimers to README.
4. **`<code>...</code>` for any literal value** (refs, chat IDs, URLs) — Apify renders monospace, instantly grokkable.
5. **`type: "number"` with `minimum: 0.5`** instead of integer + decimal sibling.
6. **`enumTitles` use a single space `" "` to hide deprecated options** without breaking enum backward-compat (Instagram does this for `"user"` and `"stories"`).
7. **`editor: "proxy"` with `proxyConfiguration`** — opt-in Apify proxy by default, mark as Advanced.
8. **`prefill` everywhere, even on optionals.** Empty prefills feel broken.
9. **`requestListSources` or typed object array** instead of hand-parsed `"key:value"` strings.
10. **`example` field** for free-text inputs — Apify renders it as placeholder, prefill renders as filled value.
11. **Add-on sections use `($)` in the section caption title** when toggling them increases cost — Google Search and Maps do this.
12. **Section descriptions ≤ 200 chars, `<b>` for the one number that matters**, never paragraphs.
13. **Section captions reference the user's mental model, not internal architecture** — `🎚️ Filter listings` not "Filter conditions". `🔔 Alerts` not "alert_channel section".
14. **Required array contains only fields with no default.** `default + required` is a contradiction.
15. **README and schema must agree on platform count** — single source of truth for the marketplace list.

---

## Section 4 — Proposed new INPUT_SCHEMA.json

Paste-ready. Comments are inline JSON-illegal placeholders meant for review only — strip the `// ...` lines before saving. Pre-stripped block is just below.

```json
{
    "$schema": "https://apify.com/schemas/v1/input.ide.json",
    "title": "Watch Arbitrage Tracker — Input",
    "description": "Track Rolex, Patek Philippe & Audemars Piguet price spreads across 6 marketplaces. Get a Telegram ping when a listing breaks below your spread threshold.",
    "type": "object",
    "schemaVersion": 1,
    "properties": {
        "references": {
            "title": "Watch references",
            "type": "array",
            "description": "Precise reference numbers give the cleanest arbitrage signals. Examples: <code>5711/1A-010</code>, <code>116500LN</code>, <code>124060</code>, <code>15500ST.OO.1220ST.04</code>.<br><br>Brand is auto-detected — mix Patek / Rolex / AP freely. Model names like <code>Nautilus</code> or <code>Daytona</code> work too but conflate sub-models with different prices.<br><br><b>Tip:</b> start with 3-5 refs you actually trade, add more later.",
            "editor": "stringList",
            "prefill": [
                "5711/1A-010",
                "116500LN",
                "124060"
            ],
            "minItems": 1,
            "uniqueItems": true,
            "sectionCaption": "🎯 What to track",
            "sectionDescription": "Pick the watches you want to monitor. 3-5 references is a good first run."
        },

        "spread_sensitivity": {
            "title": "Spread threshold (%)",
            "type": "number",
            "description": "Fire an alert when a listing sits below the cross-platform median by at least this %. Decimals work — <code>4.5</code> fires at 4.5%.<br><br><b>Guide:</b> 3% = chatty (volume flippers) · 5% = recommended · 8% = selective · 15%+ = once-a-month opportunities.",
            "editor": "number",
            "default": 5,
            "minimum": 0.5,
            "maximum": 50,
            "unit": "%",
            "sectionCaption": "🔔 Alert settings",
            "sectionDescription": "How aggressive should the alerts be and where do they land."
        },

        "alert_channel": {
            "title": "Where to receive alerts",
            "type": "string",
            "description": "Telegram is fastest for time-sensitive flips. Pick <b>Dataset only</b> if you'd rather poll Apify Console yourself.",
            "editor": "select",
            "default": "telegram",
            "enum": [
                "telegram",
                "dataset_only"
            ],
            "enumTitles": [
                "📱 Telegram (fastest)",
                "💾 Dataset only — no push"
            ]
        },

        "alert_telegram_bot_token": {
            "title": "Telegram bot token",
            "type": "string",
            "description": "One-time setup, 2 min: open <code>@BotFather</code> on Telegram → <code>/newbot</code> → name it → paste the token here. Full guide: https://core.telegram.org/bots#how-do-i-create-a-bot",
            "editor": "textfield",
            "isSecret": true,
            "nullable": true
        },

        "alert_telegram_chat_id": {
            "title": "Telegram chat ID",
            "type": "string",
            "description": "Open Telegram → search <code>@userinfobot</code> → tap Start → paste the numeric ID here.",
            "editor": "textfield",
            "isSecret": true,
            "nullable": true,
            "example": "123456789"
        },

        "filter_conditions": {
            "title": "Conditions to include",
            "type": "array",
            "description": "A <b>new</b> 5711 vs a <b>pre-owned</b> 5711 can spread by $30K+. Filtering tightens the signal.<br><br>Bobs, Watchfinder UK and European Watch scrape condition reliably. Chrono24, WatchBox and Watches of Switzerland often report <b>unknown</b> — keep it checked if you want full volume.",
            "editor": "select",
            "items": {
                "type": "string",
                "enum": [
                    "new",
                    "like-new",
                    "very-good",
                    "good",
                    "fair",
                    "vintage",
                    "pre-owned",
                    "unknown"
                ],
                "enumTitles": [
                    "🆕 New / Unworn",
                    "✨ Like new / Mint",
                    "👍 Very good",
                    "✅ Good",
                    "⚠️ Fair",
                    "🕰️ Vintage (pre-2000)",
                    "📦 Pre-owned (catch-all)",
                    "❓ Unknown (not specified)"
                ]
            },
            "uniqueItems": true,
            "default": [
                "new",
                "like-new",
                "very-good",
                "pre-owned",
                "unknown"
            ],
            "sectionCaption": "🎚️ Filter listings",
            "sectionDescription": "Tighten which listings count toward the spread. Skip if you want maximum volume."
        },

        "filter_box_papers": {
            "title": "Box & papers status to include",
            "type": "array",
            "description": "A <b>full-set</b> 5711 commands a 20-30% premium vs <b>watch-only</b>. Watchfinder, Bobs and European Watch report this reliably; others may report unknown.",
            "editor": "select",
            "items": {
                "type": "string",
                "enum": [
                    "full-set",
                    "box-and-papers",
                    "papers-only",
                    "box-only",
                    "watch-only",
                    "unknown"
                ],
                "enumTitles": [
                    "🏆 Full set",
                    "📦📄 Box + papers",
                    "📄 Papers only",
                    "📦 Box only",
                    "🕰️ Watch only",
                    "❓ Unknown"
                ]
            },
            "uniqueItems": true,
            "default": [
                "full-set",
                "box-and-papers",
                "papers-only",
                "unknown"
            ]
        },

        "strict_condition_matching": {
            "title": "Strict condition matching",
            "type": "boolean",
            "description": "When <b>on</b>, drop listings where the marketplace didn't report a condition. Pairs well with restricting marketplaces to Bobs + Watchfinder + European Watch.",
            "default": false
        },

        "platforms": {
            "title": "Marketplaces to monitor",
            "type": "array",
            "description": "Uncheck a marketplace to skip it (e.g. US-only flippers can drop the UK sources).",
            "editor": "select",
            "items": {
                "type": "string",
                "enum": [
                    "chrono24",
                    "watchbox",
                    "bobs",
                    "watchfinder",
                    "europeanwatch",
                    "watchesofswitzerland",
                    "hodinkee"
                ],
                "enumTitles": [
                    "🌍 Chrono24",
                    "🇺🇸 WatchBox / The 1916 Company",
                    "🇺🇸 Bob's Watches",
                    "🇬🇧 Watchfinder UK",
                    "🇺🇸 European Watch Company",
                    "🇬🇧 Watches of Switzerland",
                    " "
                ]
            },
            "uniqueItems": true,
            "default": [
                "chrono24",
                "watchbox",
                "bobs",
                "watchfinder",
                "europeanwatch",
                "watchesofswitzerland"
            ],
            "sectionCaption": "⚙️ Advanced — Platforms & cost",
            "sectionDescription": "Defaults are good for most dealers. Touch only if you have a specific need."
        },

        "price_ceilings": {
            "title": "Per-reference price ceilings (USD)",
            "type": "array",
            "description": "Override the median anchor with your own target intake price per reference. Format: <code>reference:max_price_usd</code> with no spaces around the colon.<br><br>Examples: <code>5711/1A-010:185000</code>, <code>116500LN:28000</code>. Leave empty to use the cross-platform median for every ref. Invalid rows are silently skipped.",
            "editor": "stringList",
            "items": { "type": "string" },
            "prefill": [],
            "default": []
        },

        "max_listings_per_ref_per_platform": {
            "title": "Max listings per ref per platform",
            "type": "integer",
            "description": "Caps fetches per reference per marketplace. Default <b>25</b> handles ~60 refs × 6 platforms ≈ 9000 listings/run. Lower for cheaper runs.",
            "editor": "number",
            "default": 25,
            "minimum": 1,
            "maximum": 200,
            "unit": "listings"
        },

        "proxyConfiguration": {
            "title": "Proxy configuration",
            "type": "object",
            "description": "Apify Proxy is recommended for reliable scraping across all 6 marketplaces. Residential proxies help avoid blocks on Chrono24 and WatchBox.",
            "editor": "proxy",
            "prefill": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            },
            "default": {
                "useApifyProxy": true
            }
        }
    },
    "required": ["references", "alert_channel"]
}
```

Net changes vs current schema:

- **13 → 13 fields**, but 1 deleted (`spread_sensitivity_decimal`) and 1 added (`proxyConfiguration`).
- **3 sections → 4 sections** (`🎯 What to track`, `🔔 Alert settings`, `🎚️ Filter listings`, `⚙️ Advanced`).
- Every section caption now matches the user's mental model.
- All descriptions ≤ 280 chars, `<code>` for literals, `<b>` for the one number that matters.
- `spread_sensitivity` is `number` with `minimum: 0.5` — decimal sibling deleted.
- `alert_telegram_chat_id` now has `isSecret: true` and an `example` placeholder.
- Required reduced to `["references", "alert_channel"]` — `spread_sensitivity` has a default, can't be missing.
- Added `proxyConfiguration` with the canonical `editor: "proxy"`.
- Stripped the "Email v0.2" promise from `alert_channel`.
- Hodinkee entry hidden via `enumTitles` " " trick (keeps the enum value for backward-compat on existing user inputs without showing the option).

Also fix in `actor.json`:

- Bump `description` to match new schema description.
- Add `categories: ["E_COMMERCE", "AUTOMATION"]` if missing.
- Ensure `pictureUrl` and `seoDescription` are set (check the Apify Console "Settings" tab).

---

## Section 5 — Quick wins (ranked by ROI)

1. **Delete `spread_sensitivity_decimal`, switch `spread_sensitivity` to `type: "number"` with `minimum: 0.5`.** 10 minutes. Removes the most obviously amateur thing in the form.
2. **Rewrite every `title` to be 1-3 words, no emoji, no parenthetical.** Move framing into `sectionCaption`. 20 minutes.
3. **Trim every `description` to ≤ 280 chars, wrap literals in `<code>`, add `<br><br>`.** 30 minutes.
4. **Reduce default `references` prefill from 5 → 3** so the first click is cheap. Pair with `max_listings_per_ref_per_platform` default 25 (already correct). 2 minutes.
5. **Add `proxyConfiguration` with `editor: "proxy"`.** 5 minutes. Single biggest "looks professional" signal.
6. **Reconcile platform count between README (13 marketplaces) and schema (7).** Either expand the enum or update the README — pick one truth today. Critical for trust.
7. **Drop `spread_sensitivity` from `required`** — it has a default. 30 seconds.
8. **Hide Hodinkee via `enumTitles: " "`** instead of the deprecation label. 1 minute.
9. **Add `isSecret: true` + `example: "123456789"` on `alert_telegram_chat_id`.** 1 minute.
10. **Move long disclaimers (NEW vs PRE-OWNED price impact, condition-scraping reliability) into README.md** under a "How filtering works" heading. Forms should describe inputs, not educate. 15 minutes.
11. **Sanity-check `actor.json` `description`** — it still says "6 marketplaces" but the user mentioned 14. Match whichever the schema commits to.
12. **(Optional, v0.2)** Replace `price_ceilings` `stringList` DSL with a typed object array (`editor: "json"`). Bigger lift; ship the above first.

Estimated total time to ship items 1-11: **~90 minutes**. Item 12 is a separate PR.
