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
    | 'watchesofswitzerland';

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
}

export interface Listing {
    ref: string;
    brand: Brand;
    platform: Platform;
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
