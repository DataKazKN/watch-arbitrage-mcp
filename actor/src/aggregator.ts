/**
 * Aggregator: groups listings by reference, computes median, detects spreads.
 *
 * Algo:
 * 1. group all listings by `ref`
 * 2. for each group, compute median/min/max in USD
 * 3. flag any listing where price_usd < median * (1 - min_spread_pct/100)
 *    as an arbitrage opportunity
 *
 * Median (vs mean) chosen because dealer markups skew distribution heavily —
 * 1 outlier $200K listing on Hodinkee shouldn't move the threshold for
 * everybody else.
 */
import type { ArbitrageOpportunity, BoxPapersStatus, Listing, Platform, PriceCeiling, PriceCeilingInput, RefStats, WatchCondition } from './types.js';
import { detectBrand } from './utils/brand.js';

/** Normalize raw condition string from crawlers into the v2 enum. */
export function normalizeCondition(raw: string): WatchCondition {
    const r = (raw || '').toLowerCase().trim();
    if (!r) return 'unknown';
    if (/\b(new|unworn|nos|brand[\s-]?new|sealed)\b/.test(r)) return 'new';
    if (/\b(like[\s-]?new|mint|excellent\+|nearly[\s-]?new)\b/.test(r)) return 'like-new';
    if (/\b(very[\s-]?good|excellent)\b/.test(r)) return 'very-good';
    if (/\b(good|fine)\b/.test(r)) return 'good';
    if (/\b(fair|worn|used\s*heavily)\b/.test(r)) return 'fair';
    if (/\b(vintage|antique|pre[\s-]?2000)\b/.test(r)) return 'vintage';
    if (/\b(pre[\s-]?owned|second[\s-]?hand|used)\b/.test(r)) return 'pre-owned';
    return 'unknown';
}

/** Detect box & papers status from listing title or condition string. */
export function detectBoxPapers(title: string, condition: string): BoxPapersStatus {
    const t = `${title} ${condition}`.toLowerCase();
    if (/\bfull[\s-]?set\b/.test(t)) return 'full-set';
    if (/\b(box\s*(\+|and|&)\s*papers|papers\s*(\+|and|&)\s*box)\b/.test(t)) return 'box-and-papers';
    if (/\bpapers[\s-]?only\b/.test(t)) return 'papers-only';
    if (/\bbox[\s-]?only\b/.test(t)) return 'box-only';
    if (/\b(no\s*box.*no\s*papers|watch[\s-]?only|head[\s-]?only)\b/.test(t)) return 'watch-only';
    return 'unknown';
}

/** Helper: precise ref = slash, 4+ digits, or brand-coded format (5711/1A, 116500LN, 15500ST). */
function isPreciseRef(ref: string): boolean {
    const r = (ref ?? '').toUpperCase().trim();
    if (!r) return false;
    if (r.includes('/')) return true;
    if (/\d{4,}/.test(r)) return true;
    return false;
}

/**
 * Bug #5 fix: extract sub-reference from listing title for cross-model precision.
 *
 * For model-name searches ("Nautilus", "Daytona", "Royal Oak"), the search returns
 * multiple sub-references (5711, 5810, 5990, 7118, 7011, 4700 — all "Nautilus").
 * Aggregating median across all sub-models inflates median (men's $250K + ladies
 * $50K = misleading $150K median) and produces FALSE arbitrage signals.
 *
 * Solution: extract the precise sub-reference from the listing title using
 * brand-specific regex. Group by sub-ref (not by user search term) for accurate
 * median + spread detection. Listings without a detectable sub-ref are kept in
 * the dataset but EXCLUDED from arbitrage detection.
 */
export function extractSubRef(title: string, brand: string): string | null {
    const t = (title ?? '').trim();
    if (!t) return null;

    if (brand === 'patek-philippe') {
        // Patek refs: 5711/1A-010, 5990/1A, 5810G-001, 7118/1200R-010, 5167A
        const m = t.match(/\b([56]\d{3}\/?\d{0,4}[A-Z]?[-\s]?\d{0,3})\b/);
        if (m) return m[1].replace(/\s+/g, '').toUpperCase();
    }

    if (brand === 'rolex') {
        // Rolex refs: 116500LN, 124060, 126710BLNR, 16523, 16800
        // 5+ digit minimum to avoid matching 4-digit years (2024, 2026) in titles like
        // "Rolex Submariner Unworn 2026 / 124060". Order: 6-digit first, fallback 5-digit.
        const m6 = t.match(/\b(\d{6}[A-Z]{0,5})\b/);
        if (m6) return m6[1].toUpperCase();
        const m5 = t.match(/\b(\d{5}[A-Z]{0,5})\b/);
        if (m5) return m5[1].toUpperCase();
    }

    if (brand === 'audemars-piguet') {
        // AP refs: 15500ST, 67600ST.OO.1210ST.01, 26331ST.OO.1220ST.01
        const m = t.match(/\b(\d{5}(?:ST|OR|BC|SP|CE)(?:\.[A-Z0-9.]+)?)\b/);
        if (m) return m[1].toUpperCase();
    }

    return null;
}

/**
 * Bug #4 fix: filter model-name false positives by title-matching.
 *
 * For STRICT refs ("5711/1A", "116500LN"): crawler-level filter already enforced — pass through.
 * For BRAND-only refs ("Patek", "Rolex", "AP"): broadness intentional — pass through.
 * For MODEL-NAME refs ("Daytona", "Submariner", "Royal Oak", "Nautilus"): require the model
 *   word/phrase in the listing title. Eliminates europeanwatch brand-grid false positives
 *   (where "Daytona" search returned all Rolex models).
 */
function refMatchesListingTitle(ref: string, listingTitle: string): boolean {
    const refLower = (ref ?? '').toLowerCase().trim();
    if (!refLower) return true;

    // Strict ref (slash or 4+ digit run) — already filtered at crawler level
    if (refLower.includes('/') || /\d{4,}/.test(refLower)) return true;

    // Brand-only ref — broadness intentional
    if (/^(patek\s*philippe|patek|pp|rolex|rlx|ap|audemars\s*piguet|audemars)$/.test(refLower)) {
        return true;
    }

    // Model-name ref — require the model name (or its variants) in the title
    const titleLower = (listingTitle ?? '').toLowerCase();
    if (!titleLower) return false;

    // Normalize spacing/hyphens both sides ("royal oak" matches "royal-oak", "royaloak")
    const refKey = refLower.replace(/[\s-]+/g, '');
    const titleKey = titleLower.replace(/[\s-]+/g, '');
    return titleKey.includes(refKey);
}

/** Filter listings whose title doesn't match the searched ref (model-name precision). */
export function filterByRefMatch(listings: Listing[]): Listing[] {
    return listings.filter((l) => refMatchesListingTitle(l.ref, l.title));
}

/** Apply user-selected filters before aggregation. */
export function applyFilters(
    listings: Listing[],
    filterConditions: WatchCondition[] | undefined,
    filterBoxPapers: BoxPapersStatus[] | undefined,
    strictConditionMatching: boolean = false,
): Listing[] {
    return listings.filter((l) => {
        const cond = l.condition_normalized ?? normalizeCondition(l.condition);
        const bp = l.box_papers ?? detectBoxPapers(l.title, l.condition);

        // Strict mode: exclude all 'unknown' (only keep listings where condition was reliably scraped).
        if (strictConditionMatching && cond === 'unknown') {
            return false;
        }

        if (filterConditions && filterConditions.length > 0 && !filterConditions.includes(cond)) {
            return false;
        }
        if (filterBoxPapers && filterBoxPapers.length > 0 && !filterBoxPapers.includes(bp)) {
            return false;
        }
        return true;
    });
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Bug #2 fix: trimmed median — drop bottom/top trimPct% before computing
 * median. Eliminates extreme outliers (e.g. $3.8M typo, $200K+ dealer markups
 * pulling median up). Falls back to plain median when N < 5 (not enough data
 * to trim safely).
 */
function trimmedMedian(prices: number[], trimPct: number = 0.1): number {
    if (prices.length === 0) return 0;
    if (prices.length < 5) return median(prices);
    const sorted = [...prices].sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * trimPct);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    const mid = Math.floor(trimmed.length / 2);
    return trimmed.length % 2 === 0 ? (trimmed[mid - 1] + trimmed[mid]) / 2 : trimmed[mid];
}

export function aggregate(listings: Listing[]): {
    stats: RefStats[];
    opportunities: ArbitrageOpportunity[];
} {
    // Bug #5 fix: group by sub-reference extracted from title (cross-model precision).
    // For broad refs ("Nautilus", "Daytona"), we use the sub-ref from each listing's
    // title so different sub-models (5711 vs 7011 vs 5990) get separate medians.
    // For precise refs ("5711/1A"), the sub-ref typically equals the search ref —
    // grouping is identical to before.
    // Listings without a detectable sub-ref are kept in dataset but excluded from
    // arbitrage stats (no reliable median possible without sub-model identification).
    const bySubRef = new Map<string, Listing[]>();
    for (const l of listings) {
        const subRef = extractSubRef(l.title, l.brand) ?? (isPreciseRef(l.ref) ? l.ref.toUpperCase() : null);
        if (!subRef) continue; // no detectable sub-ref → skip arbitrage stats (kept in dataset)
        if (!bySubRef.has(subRef)) bySubRef.set(subRef, []);
        bySubRef.get(subRef)!.push(l);
    }

    const stats: RefStats[] = [];

    for (const [ref, items] of bySubRef.entries()) {
        if (items.length === 0) continue;
        const prices = items.map((i) => i.price_usd).filter((p) => p > 0);
        if (prices.length === 0) continue;

        const platformsCovered = Array.from(new Set(items.map((i) => i.platform))) as Platform[];

        stats.push({
            ref,
            brand: detectBrand(ref),
            count: items.length,
            median_usd: Math.round(trimmedMedian(prices)),
            min_usd: Math.min(...prices),
            max_usd: Math.max(...prices),
            platforms_covered: platformsCovered,
        });
    }

    return { stats, opportunities: [] };
}

/**
 * Parse one ``"reference:max_price_usd"`` string into a {@link PriceCeiling}.
 *
 * Tolerant: trims, accepts multiple separators (``:``, ``=``, ``->``,
 * ``|``), accepts thousands separators in the price ("185,000", "$185 000",
 * "185k", "1.5M"). Returns ``null`` for unparseable rows so the caller
 * can silently skip bad entries without crashing the actor run.
 */
function parsePriceCeilingString(row: string): PriceCeiling | null {
    if (!row || typeof row !== 'string') return null;
    const cleaned = row.trim();
    if (!cleaned) return null;

    // Split on the first occurrence of any recognized separator
    const sepMatch = cleaned.match(/^(.+?)\s*(?::|=>|=|->|\|)\s*(.+)$/);
    if (!sepMatch) return null;
    const refRaw = sepMatch[1];
    const priceRaw = sepMatch[2];
    const reference = refRaw.replace(/\s+/g, '').toUpperCase();
    if (!reference) return null;

    // Strip currency symbols, commas, whitespace from the price side
    let priceStr = priceRaw.replace(/[\s$,€£¥]/g, '');
    // Handle "185k" / "1.5M" shorthand for dealer-friendly typing
    let multiplier = 1;
    const tail = priceStr.slice(-1).toLowerCase();
    if (tail === 'k') {
        multiplier = 1_000;
        priceStr = priceStr.slice(0, -1);
    } else if (tail === 'm') {
        multiplier = 1_000_000;
        priceStr = priceStr.slice(0, -1);
    }
    const value = Number.parseFloat(priceStr) * multiplier;
    if (!Number.isFinite(value) || value <= 0) return null;

    return { reference, max_price_usd: Math.round(value) };
}

/**
 * Build a lookup map from a list of per-reference price ceilings. Keys are
 * normalised (uppercase, whitespace-stripped) to match how sub-refs come
 * out of {@link extractSubRef}.
 *
 * Accepts BOTH input shapes:
 * - ``"ref:price"`` strings (current user-facing format).
 * - ``{reference, max_price_usd}`` objects (legacy JSON-editor format).
 *
 * Empty / unparseable rows are silently skipped — a bad row should not
 * crash the actor run.
 */
export function buildPriceCeilingMap(
    ceilings: PriceCeilingInput[] | undefined,
): Map<string, number> {
    const map = new Map<string, number>();
    if (!ceilings) return map;
    for (const raw of ceilings) {
        let parsed: PriceCeiling | null;
        if (typeof raw === 'string') {
            parsed = parsePriceCeilingString(raw);
        } else if (raw && typeof raw === 'object') {
            const key = (raw.reference ?? '').replace(/\s+/g, '').toUpperCase();
            const value = Number(raw.max_price_usd);
            parsed = key && Number.isFinite(value) && value > 0
                ? { reference: key, max_price_usd: Math.round(value) }
                : null;
        } else {
            parsed = null;
        }
        if (parsed) {
            map.set(parsed.reference, parsed.max_price_usd);
        }
    }
    return map;
}

export function detectOpportunities(
    listings: Listing[],
    stats: RefStats[],
    minSpreadPct: number,
    priceCeilings: PriceCeilingInput[] | Map<string, number> = [],
): ArbitrageOpportunity[] {
    // stats are keyed by SUB-REF (Bug #5 fix). Match each listing to its sub-ref.
    const statsByRef = new Map(stats.map((s) => [s.ref, s]));
    const ceilingMap = priceCeilings instanceof Map
        ? priceCeilings
        : buildPriceCeilingMap(priceCeilings);
    const opportunities: ArbitrageOpportunity[] = [];
    const now = new Date().toISOString();

    for (const l of listings) {
        const subRef = extractSubRef(l.title, l.brand) ?? (isPreciseRef(l.ref) ? l.ref.toUpperCase() : null);
        if (!subRef) continue; // listing has no detectable sub-ref → skip arbitrage check

        const ceiling = ceilingMap.get(subRef);
        const s = statsByRef.get(subRef);

        let anchor: number;
        let usedCeiling: boolean;
        if (ceiling) {
            // User-defined per-reference ceiling overrides the median anchor.
            // We still record stats.median_usd for the dataset, but the alert
            // fires when ANY listing is below the ceiling — regardless of where
            // the platform median sits that day.
            anchor = ceiling;
            usedCeiling = true;
        } else {
            // Fall back to the cross-platform median anchor (default behavior).
            if (!s || s.count < 2) continue; // need at least 2 same sub-ref listings
            anchor = s.median_usd * (1 - minSpreadPct / 100);
            usedCeiling = false;
        }

        if (l.price_usd >= anchor) continue;

        // Bug #3 fix: skip listings priced suspiciously low relative to the
        // anchor — typically wrong-watch matches (different model with similar
        // ref number), typos, or scams. Real arbitrage rarely exceeds 70%
        // spread on listed prices. We apply this floor against whichever
        // anchor is active (median or user-supplied ceiling).
        const MIN_PRICE_FLOOR_PCT = 0.3;
        const baseForFloor = usedCeiling ? ceiling! : s!.median_usd;
        if (l.price_usd < baseForFloor * MIN_PRICE_FLOOR_PCT) continue;

        const referenceMedian = s?.median_usd ?? 0;
        const spreadBase = usedCeiling ? ceiling! : referenceMedian;
        const spread_usd = Math.round(spreadBase - l.price_usd);
        const spread_pct = spreadBase > 0
            ? Math.round(((spreadBase - l.price_usd) / spreadBase) * 1000) / 10
            : 0;

        opportunities.push({
            ref: subRef,
            brand: l.brand,
            listing: l,
            median_usd: referenceMedian,
            spread_usd,
            spread_pct,
            detected_at: now,
        });
    }

    // Sort by spread_pct descending — biggest opportunities first.
    opportunities.sort((a, b) => b.spread_pct - a.spread_pct);
    return opportunities;
}
