/**
 * Shared types for WatchArb actor.
 */

export type Platform =
    | 'chrono24'
    | 'watchbox'
    | 'bobs'
    | 'hodinkee'
    | 'watchfinder'
    | 'europeanwatch'
    | 'watchesofswitzerland'
    // ── beta sources added 2026-05-17, pruned 2026-05-17 evening ──
    // Originally added 7 beta slots (wempe, govberg, crownandcaliber, tropicalwatch,
    // subdial, mrwatches, yahoojp) to honor a 14-marketplace marketing claim. Live
    // DOM verification (Chrome MCP, 2026-05-17) found that 5 of those 7 are
    // unscrapeable: wempe (AD only, no online pre-owned pricing), govberg (redirects
    // to the1916company.com = dup of watchbox slot), subdial (empty home, /search 404),
    // crownandcaliber (pivoted to lifestyle brand post-Hodinkee acquisition, /search
    // 404), tropicalwatch (/search 404). Pruned to keep the enum honest.
    //
    // Survivors:
    | 'watchclub' // verified live 2026-05-17 (DOM v1), UK HQ + HK office
    | 'yahoojp' // real source, requires apifyProxyCountry='JP' (geo-blocks EEA/UK)
    // Round 2 expansion (added 2026-05-17 evening, all live-verified):
    | 'spliedt' // DE — H. Spliedt, Munich/Hamburg/Sylt pre-owned, Shopify .product-card
    | 'acollectedman' // UK — A Collected Man London, premium pre-owned + archive
    // Round 3 expansion (added 2026-05-18, live-verified via Chrome MCP):
    | 'analogshift' // US (NYC) — Analog:Shift, vintage + neo-vintage Shopify, .card-wrapper
    | 'bachmannscher'; // DE (Munich) — Bachmann & Scher, TYPO3 .watch-list-item

/**
 * Country code per platform. ISO-style 2-letter codes, plus "EU" as a regional
 * catch-all for platforms with cross-EU presence. Derived statically from the
 * platform identity (where the platform's primary inventory resides), not from
 * per-listing seller geo (which would require detail-page scraping).
 *
 * Used by `computeCrossCountrySpread()` to produce country-pair arbitrage
 * opportunities ("Tokyo $148.2k ↔ Brooklyn $192.5k").
 */
export type Country = 'US' | 'UK' | 'DE' | 'CH' | 'EU' | 'JP' | 'HK';

export const PLATFORM_COUNTRY: Record<Platform, Country> = {
    chrono24: 'EU',
    watchbox: 'US',
    bobs: 'US',
    hodinkee: 'US',
    watchfinder: 'UK',
    europeanwatch: 'US',
    watchesofswitzerland: 'UK',
    watchclub: 'UK',
    yahoojp: 'JP',
    spliedt: 'DE',
    acollectedman: 'UK',
    analogshift: 'US',
    bachmannscher: 'DE',
};

export const COUNTRY_LABEL: Record<Country, string> = {
    US: 'United States',
    UK: 'United Kingdom',
    DE: 'Germany',
    CH: 'Switzerland',
    EU: 'Europe',
    JP: 'Japan',
    HK: 'Hong Kong',
};

export type Brand = 'patek-philippe' | 'rolex' | 'audemars-piguet' | 'unknown';

export type WatchCondition = 'new' | 'like-new' | 'very-good' | 'good' | 'fair' | 'vintage' | 'pre-owned' | 'unknown';
export type BoxPapersStatus = 'full-set' | 'box-and-papers' | 'papers-only' | 'box-only' | 'watch-only' | 'unknown';

export interface PriceCeiling {
    reference: string;
    max_price_usd: number;
}

/**
 * Raw input shape for price ceilings. The user-facing input schema
 * uses ``editor: stringList`` so the operator types one "ref:price"
 * pair per row (e.g. ``"5711/1A-010:185000"``). We also accept the
 * legacy object-array shape (``{reference, max_price_usd}[]``) for
 * back-compat with runs already configured with the JSON editor.
 */
export type PriceCeilingInput = string | PriceCeiling;

/** Apify proxy configuration (matches `editor: "proxy"` JSON shape). */
export interface ProxyConfigurationInput {
    useApifyProxy?: boolean;
    apifyProxyGroups?: string[];
    apifyProxyCountry?: string;
    proxyUrls?: string[];
}

export interface ActorInput {
    references: string[];
    platforms: Platform[];
    /** Spread threshold in % (0.5 - 50, default 5). Schema is `number`; we still
     *  accept `string` defensively for older runs that used the integer+decimal pair. */
    spread_sensitivity?: number | string;
    /** Per-reference price ceilings — overrides the median anchor for these refs only.
     *  Accepts either "ref:price" strings (current UI) or {reference, max_price_usd}
     *  objects (legacy JSON-editor shape). */
    price_ceilings?: PriceCeilingInput[];
    alert_channel?: 'telegram' | 'dataset_only';
    max_listings_per_ref_per_platform: number;
    alert_telegram_bot_token?: string;
    alert_telegram_chat_id?: string;
    filter_conditions?: WatchCondition[];
    filter_box_papers?: BoxPapersStatus[];
    strict_condition_matching?: boolean;
    proxyConfiguration?: ProxyConfigurationInput;
    /** Alert framing strategy.
     *  - `cross_platform_global` (default): single cross-platform median, alert
     *    when any listing breaks below by `spread_sensitivity` %.
     *  - `cross_country_pair`: surface country-pair gaps ("JP $148k ↔ US $192k").
     *    Better for pro dealers who already know about the gap and want explicit
     *    pair-by-pair routing decisions.
     *  - `per_country`: per-country median + alert when a listing breaks below
     *    its own country's median (rare; useful for local-market specialists). */
    compare_mode?: 'cross_platform_global' | 'cross_country_pair' | 'per_country';
}

export interface Listing {
    ref: string;
    brand: Brand;
    platform: Platform;
    /** Country derived from `PLATFORM_COUNTRY[platform]` at aggregator time. Stable
     *  inventory-country, not per-listing seller geo. */
    country?: Country;
    title: string;
    price_usd: number;
    price_orig: number;
    currency: string;
    listing_url: string;
    dealer: string;
    condition: string;
    condition_normalized?: WatchCondition;
    box_papers?: BoxPapersStatus;
    year: number | null;
    location: string;
    scraped_at: string;
}

/**
 * One side of a cross-country arbitrage pair: the cheapest listing for a given
 * `(reference, country)` combination after condition filtering.
 */
export interface CountryQuote {
    country: Country;
    cheapest_price_usd: number;
    listing: Listing;
    sample_size: number;
}

/**
 * Cross-country arbitrage opportunity: the gap between the cheapest listing in
 * country `from` and the cheapest listing in country `to`, for the same reference
 * and condition class. Used in alert messages like
 *   "5711/1A — JP $148,200 ↔ US $192,500 (22.7% spread)".
 */
export interface CrossCountrySpread {
    ref: string;
    brand: Brand;
    from: CountryQuote;
    to: CountryQuote;
    gap_usd: number;
    gap_pct: number;
    detected_at: string;
}

export interface RefStats {
    ref: string;
    brand: Brand;
    count: number;
    median_usd: number;
    min_usd: number;
    max_usd: number;
    platforms_covered: Platform[];
}

export interface ArbitrageOpportunity {
    ref: string;
    brand: Brand;
    listing: Listing;
    median_usd: number;
    spread_usd: number;
    spread_pct: number;
    detected_at: string;
}

export interface CrawlContext {
    references: string[];
    maxListingsPerRef: number;
}
