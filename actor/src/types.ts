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

export interface ActorInput {
    references: string[];
    platforms: Platform[];
    spread_sensitivity?: string;
    alert_channel?: 'telegram' | 'email' | 'both' | 'dataset_only';
    max_listings_per_ref_per_platform: number;
    alert_telegram_bot_token?: string;
    alert_telegram_chat_id?: string;
    alert_email?: string;
    filter_conditions?: WatchCondition[];
    filter_box_papers?: BoxPapersStatus[];
    strict_condition_matching?: boolean;
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
