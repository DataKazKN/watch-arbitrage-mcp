/**
 * Unit tests for the spread-detection aggregator.
 *
 * Focus areas (2026-05-13):
 * - ``buildPriceCeilingMap`` accepts BOTH input shapes (the new
 *   ``"ref:price"`` stringList format AND the legacy object array).
 * - The price-ceiling parser is tolerant: handles separators, currency
 *   symbols, thousands separators, shorthand (185k / 1.5M), and
 *   gracefully drops unparseable rows.
 * - ``detectOpportunities`` routes per listing: ceilinged refs use
 *   the user-supplied anchor; un-ceilinged refs fall back to the
 *   trimmed-median anchor.
 * - The MIN_PRICE_FLOOR_PCT safety check applies against whichever
 *   anchor fired (no fake "$2K Patek" alerts when the ceiling is
 *   $185K).
 */
import { describe, expect, it } from 'vitest';

import {
    annotateCountries,
    buildPriceCeilingMap,
    computeCrossCountrySpread,
    detectOpportunities,
} from '../src/aggregator.js';
import type { Listing, RefStats } from '../src/types.js';

function makeListing(overrides: Partial<Listing> = {}): Listing {
    return {
        ref: '5711/1A-010',
        brand: 'patek-philippe',
        platform: 'chrono24',
        title: 'Patek Philippe Nautilus 5711/1A-010 Blue Dial',
        price_usd: 180000,
        price_orig: 180000,
        currency: 'USD',
        listing_url: 'https://example.com/listing/1',
        dealer: 'Example Dealer',
        condition: 'new',
        year: 2024,
        location: 'CH',
        scraped_at: '2026-05-13T00:00:00Z',
        ...overrides,
    };
}

function makeStats(overrides: Partial<RefStats> = {}): RefStats {
    return {
        ref: '5711/1A-010',
        brand: 'patek-philippe',
        count: 5,
        median_usd: 200000,
        min_usd: 178000,
        max_usd: 230000,
        platforms_covered: ['chrono24', 'watchbox', 'bobs'],
        ...overrides,
    };
}

// ---------------------------------------------------------------------
// buildPriceCeilingMap — string + object shapes + tolerant parser
// ---------------------------------------------------------------------

describe('buildPriceCeilingMap', () => {
    it('parses the canonical "ref:price" string format', () => {
        const map = buildPriceCeilingMap(['5711/1A-010:185000', '116500LN:28000']);
        expect(map.get('5711/1A-010')).toBe(185000);
        expect(map.get('116500LN')).toBe(28000);
        expect(map.size).toBe(2);
    });

    it('accepts alternative separators (=, ->, |)', () => {
        const map = buildPriceCeilingMap(['5711/1A-010=185000', '116500LN->28000', '124060|13500']);
        expect(map.get('5711/1A-010')).toBe(185000);
        expect(map.get('116500LN')).toBe(28000);
        expect(map.get('124060')).toBe(13500);
    });

    it('strips currency symbols and thousands separators', () => {
        const map = buildPriceCeilingMap(['5711/1A-010:$185,000', '116500LN:€28 000', '124060: $13,500.00']);
        expect(map.get('5711/1A-010')).toBe(185000);
        expect(map.get('116500LN')).toBe(28000);
        expect(map.get('124060')).toBe(13500);
    });

    it('understands "185k" and "1.5M" shorthand', () => {
        const map = buildPriceCeilingMap(['5711/1A-010:185k', '15500ST.OO.1220ST.04:1.5M', '116500LN:28K']);
        expect(map.get('5711/1A-010')).toBe(185000);
        expect(map.get('15500ST.OO.1220ST.04')).toBe(1500000);
        expect(map.get('116500LN')).toBe(28000);
    });

    it('uppercases + strips whitespace from the reference', () => {
        const map = buildPriceCeilingMap([' 5711/1a-010 : 185000 ', '\t116500ln:28000\n']);
        expect(map.get('5711/1A-010')).toBe(185000);
        expect(map.get('116500LN')).toBe(28000);
    });

    it('accepts the legacy object-array shape (back-compat)', () => {
        const map = buildPriceCeilingMap([
            { reference: '5711/1A-010', max_price_usd: 185000 },
            { reference: 'lowercase-ref', max_price_usd: 1000 },
        ]);
        expect(map.get('5711/1A-010')).toBe(185000);
        expect(map.get('LOWERCASE-REF')).toBe(1000);
    });

    it('mixes string + object rows in the same input', () => {
        const map = buildPriceCeilingMap([
            '5711/1A-010:185000',
            { reference: '116500LN', max_price_usd: 28000 },
            '124060:13500',
        ]);
        expect(map.size).toBe(3);
        expect(map.get('5711/1A-010')).toBe(185000);
        expect(map.get('116500LN')).toBe(28000);
        expect(map.get('124060')).toBe(13500);
    });

    it('silently skips unparseable rows', () => {
        const map = buildPriceCeilingMap([
            '5711/1A-010:185000', // ok
            'no-separator-row', // skipped: missing separator
            '5711/1A-010:not-a-number', // skipped: non-numeric price
            '5711/1A-010:0', // skipped: zero price
            '5711/1A-010:-100', // skipped: negative price
            ':185000', // skipped: empty reference
            '', // skipped: empty string
            { reference: '', max_price_usd: 1 } as any, // skipped
            { reference: 'X', max_price_usd: NaN } as any, // skipped
            null as any, // skipped
        ]);
        expect(map.size).toBe(1);
        expect(map.get('5711/1A-010')).toBe(185000);
    });

    it('returns an empty map when input is undefined / empty', () => {
        expect(buildPriceCeilingMap(undefined).size).toBe(0);
        expect(buildPriceCeilingMap([]).size).toBe(0);
    });

    it('a later row for the same reference overrides an earlier one', () => {
        const map = buildPriceCeilingMap(['5711/1A-010:100000', '5711/1A-010:185000']);
        expect(map.get('5711/1A-010')).toBe(185000);
        expect(map.size).toBe(1);
    });
});

// ---------------------------------------------------------------------
// detectOpportunities — ceiling vs median anchor routing
// ---------------------------------------------------------------------

describe('detectOpportunities — anchor routing', () => {
    it('uses the per-reference ceiling when one is configured', () => {
        const listings = [
            makeListing({ price_usd: 170000, listing_url: 'https://example.com/below' }),
            makeListing({ price_usd: 220000, listing_url: 'https://example.com/above' }),
        ];
        const stats = [makeStats({ median_usd: 200000, count: 5 })];

        // Ceiling 185k means: alert anything listed below 185k for 5711/1A-010,
        // regardless of where the median sits.
        const ops = detectOpportunities(listings, stats, 5, ['5711/1A-010:185000']);

        expect(ops).toHaveLength(1);
        expect(ops[0]?.listing.price_usd).toBe(170000);
        // spread_pct is computed against the ceiling (185000), not the median
        // → (185000 - 170000) / 185000 = 8.1%
        expect(ops[0]?.spread_pct).toBeCloseTo(8.1, 1);
        expect(ops[0]?.spread_usd).toBe(15000);
        // median_usd field on the opportunity still reports the platform
        // median for transparency in the dataset row
        expect(ops[0]?.median_usd).toBe(200000);
    });

    it('falls back to the median anchor when no ceiling is set for the ref', () => {
        const listings = [
            // 8% below the median of 200k → 184k. Default sensitivity 5% means
            // anything below 190k triggers. 184k should fire; 195k should not.
            makeListing({ price_usd: 184000, listing_url: 'https://example.com/deal' }),
            makeListing({ price_usd: 195000, listing_url: 'https://example.com/skip' }),
        ];
        const stats = [makeStats({ median_usd: 200000, count: 5 })];

        const ops = detectOpportunities(listings, stats, 5, []);

        expect(ops).toHaveLength(1);
        expect(ops[0]?.listing.price_usd).toBe(184000);
        // Spread vs median: (200000 - 184000) / 200000 = 8.0%
        expect(ops[0]?.spread_pct).toBeCloseTo(8.0, 1);
    });

    it('mix-and-match: ceiling refs use ceiling, others use median', () => {
        const stats = [
            makeStats({ ref: '5711/1A-010', median_usd: 200000, count: 5 }),
            makeStats({
                ref: '116500LN',
                brand: 'rolex',
                median_usd: 30000,
                count: 5,
                min_usd: 26000,
                max_usd: 35000,
            }),
        ];
        const listings = [
            // Patek 5711/1A-010 has a ceiling of 185000 → 170000 fires.
            makeListing({
                ref: '5711/1A-010',
                title: 'Patek 5711/1A-010 blue',
                brand: 'patek-philippe',
                price_usd: 170000,
                listing_url: 'https://example.com/patek-deal',
            }),
            // Rolex 116500LN has NO ceiling → median anchor. 30000*(1-0.05) =
            // 28500. A listing at 28000 should fire (5% rule), one at 29500
            // should not.
            makeListing({
                ref: '116500LN',
                title: 'Rolex 116500LN Daytona White',
                brand: 'rolex',
                price_usd: 28000,
                listing_url: 'https://example.com/rolex-deal',
            }),
            makeListing({
                ref: '116500LN',
                title: 'Rolex 116500LN Daytona White II',
                brand: 'rolex',
                price_usd: 29500,
                listing_url: 'https://example.com/rolex-skip',
            }),
        ];

        const ops = detectOpportunities(listings, stats, 5, ['5711/1A-010:185000']);
        const urls = ops.map((o) => o.listing.listing_url).sort();
        expect(urls).toEqual(['https://example.com/patek-deal', 'https://example.com/rolex-deal']);
    });

    it('applies the MIN_PRICE_FLOOR_PCT against the active anchor (ceiling)', () => {
        // Ceiling 185k. MIN_PRICE_FLOOR_PCT = 30% → anything < 55,500
        // is treated as a wrong-watch / typo / scam and skipped.
        const listings = [
            makeListing({ price_usd: 50000, listing_url: 'https://example.com/scam' }),
            makeListing({ price_usd: 100000, listing_url: 'https://example.com/real' }),
        ];
        const stats = [makeStats({ median_usd: 200000, count: 5 })];

        const ops = detectOpportunities(listings, stats, 5, ['5711/1A-010:185000']);
        const urls = ops.map((o) => o.listing.listing_url);
        expect(urls).toEqual(['https://example.com/real']);
    });

    it('returns no opportunities when stats are missing AND no ceiling is set', () => {
        const listings = [makeListing({ price_usd: 100000 })];
        const ops = detectOpportunities(listings, [], 5, []);
        expect(ops).toHaveLength(0);
    });

    it('still finds opportunities when stats are missing but a ceiling IS set', () => {
        // Ceiling acts as a STANDALONE anchor — doesn't need median stats
        // (the user provided the truth themselves).
        const listings = [makeListing({ price_usd: 170000, listing_url: 'https://example.com/x' })];
        const ops = detectOpportunities(listings, [], 5, ['5711/1A-010:185000']);
        expect(ops).toHaveLength(1);
        expect(ops[0]?.listing.price_usd).toBe(170000);
    });

    it('accepts a pre-built Map directly (skipping the parser)', () => {
        const listings = [makeListing({ price_usd: 170000, listing_url: 'https://example.com/x' })];
        const stats = [makeStats({ median_usd: 200000, count: 5 })];
        const ceilingMap = new Map([['5711/1A-010', 185000]]);
        const ops = detectOpportunities(listings, stats, 5, ceilingMap);
        expect(ops).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------
// annotateCountries — derives Country from platform identity
// ---------------------------------------------------------------------

describe('annotateCountries', () => {
    it('adds country to every listing based on PLATFORM_COUNTRY map', () => {
        const listings = [
            makeListing({ platform: 'bobs' }), // US
            makeListing({ platform: 'watchfinder' }), // UK
            makeListing({ platform: 'spliedt' }), // DE
            makeListing({ platform: 'yahoojp' }), // JP
            makeListing({ platform: 'analogshift' }), // US
            makeListing({ platform: 'bachmannscher' }), // DE
        ];
        const annotated = annotateCountries(listings);
        expect(annotated.map((l) => l.country)).toEqual(['US', 'UK', 'DE', 'JP', 'US', 'DE']);
    });

    it('does not mutate input listings', () => {
        const listings = [makeListing({ platform: 'bobs' })];
        const annotated = annotateCountries(listings);
        expect(listings[0].country).toBeUndefined();
        expect(annotated[0].country).toBe('US');
    });
});

// ---------------------------------------------------------------------
// computeCrossCountrySpread — pair generation for arbitrage routing
// ---------------------------------------------------------------------

describe('computeCrossCountrySpread', () => {
    it('returns empty array when fewer than 2 listings exist for the ref', () => {
        const listings = annotateCountries([makeListing({ platform: 'yahoojp', price_usd: 148200 })]);
        const spreads = computeCrossCountrySpread(listings, '5711/1A-010');
        expect(spreads).toEqual([]);
    });

    it('returns empty array when all listings are in the same country', () => {
        const listings = annotateCountries([
            makeListing({ platform: 'bobs', price_usd: 170000 }),
            makeListing({ platform: 'watchbox', price_usd: 180000 }),
            makeListing({ platform: 'hodinkee', price_usd: 192500 }),
        ]);
        const spreads = computeCrossCountrySpread(listings, '5711/1A-010');
        expect(spreads).toEqual([]);
    });

    it('produces JP↔US cross-country pair with positive gap', () => {
        const listings = annotateCountries([
            makeListing({ platform: 'yahoojp', price_usd: 148200, listing_url: 'https://yj.com/a' }),
            makeListing({ platform: 'bobs', price_usd: 180000, listing_url: 'https://bobs.com/a' }),
            makeListing({ platform: 'hodinkee', price_usd: 192500, listing_url: 'https://hodinkee.com/a' }),
        ]);
        const spreads = computeCrossCountrySpread(listings, '5711/1A-010');
        const jpUs = spreads.find((s) => s.from.country === 'JP' && s.to.country === 'US');
        expect(jpUs).toBeDefined();
        expect(jpUs?.from.cheapest_price_usd).toBe(148200);
        expect(jpUs?.to.cheapest_price_usd).toBe(180000); // cheapest US, not most expensive
        expect(jpUs?.gap_usd).toBeCloseTo(31800, 0);
        expect(jpUs?.gap_pct).toBeCloseTo(17.67, 1);
    });

    it('picks cheapest listing per country as the quote anchor', () => {
        const listings = annotateCountries([
            makeListing({ platform: 'bobs', price_usd: 200000 }),
            makeListing({ platform: 'watchbox', price_usd: 170000 }), // cheapest US
            makeListing({ platform: 'hodinkee', price_usd: 195000 }),
            makeListing({ platform: 'watchfinder', price_usd: 165000 }), // cheapest UK
            makeListing({ platform: 'acollectedman', price_usd: 175000 }),
        ]);
        const spreads = computeCrossCountrySpread(listings, '5711/1A-010');
        const ukUs = spreads.find((s) => s.from.country === 'UK' && s.to.country === 'US');
        expect(ukUs?.from.cheapest_price_usd).toBe(165000);
        expect(ukUs?.to.cheapest_price_usd).toBe(170000);
    });

    it('sets sample_size to total listings per country, not just the cheapest one', () => {
        const listings = annotateCountries([
            makeListing({ platform: 'bobs', price_usd: 170000 }), // US — cheapest
            makeListing({ platform: 'watchbox', price_usd: 180000 }), // US
            makeListing({ platform: 'hodinkee', price_usd: 195000 }), // US
            makeListing({ platform: 'watchfinder', price_usd: 175000 }), // UK — cheapest UK
        ]);
        const spreads = computeCrossCountrySpread(listings, '5711/1A-010');
        // US ($170k) is cheaper than UK ($175k) → pair direction is US → UK.
        const usUk = spreads.find((s) => s.from.country === 'US' && s.to.country === 'UK');
        expect(usUk?.from.sample_size).toBe(3);
        expect(usUk?.to.sample_size).toBe(1);
    });

    it('does not produce reverse-direction pairs (no JP↔JP, no zero-gap)', () => {
        const listings = annotateCountries([
            makeListing({ platform: 'bobs', price_usd: 180000 }),
            makeListing({ platform: 'watchfinder', price_usd: 175000 }),
        ]);
        const spreads = computeCrossCountrySpread(listings, '5711/1A-010');
        // Only one direction: UK → US (UK is cheaper)
        expect(spreads).toHaveLength(1);
        expect(spreads[0].from.country).toBe('UK');
        expect(spreads[0].to.country).toBe('US');
    });

    it('filters out listings with price_usd <= 0', () => {
        const listings = annotateCountries([
            makeListing({ platform: 'bobs', price_usd: 0 }),
            makeListing({ platform: 'yahoojp', price_usd: 148200 }),
        ]);
        const spreads = computeCrossCountrySpread(listings, '5711/1A-010');
        expect(spreads).toEqual([]);
    });
});
