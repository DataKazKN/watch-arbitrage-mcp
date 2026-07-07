import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArbitrageOpportunity, CrossCountrySpread } from '../src/types.js';

const actorCall = vi.fn();
const actorCharge = vi.fn();
const actorGetValue = vi.fn();
const actorSetValue = vi.fn();
const logError = vi.fn();
const logWarning = vi.fn();

vi.mock('apify', () => ({
    Actor: {
        call: actorCall,
        charge: actorCharge,
        getValue: actorGetValue,
        setValue: actorSetValue,
    },
    log: {
        error: logError,
        warning: logWarning,
    },
}));

const { dispatchAlerts, dispatchCrossCountryAlerts } = await import('../src/alerts.js');

function makeOpportunity(overrides: Partial<ArbitrageOpportunity> = {}): ArbitrageOpportunity {
    return {
        ref: '124060',
        brand: 'rolex',
        median_usd: 11754,
        spread_usd: 1704,
        spread_pct: 14.5,
        detected_at: '2026-06-21T20:03:02.475Z',
        listing: {
            ref: '124060',
            brand: 'rolex',
            platform: 'watchbox',
            title: 'Rolex M124060-0001 124060',
            price_usd: 10050,
            price_orig: 10050,
            currency: 'USD',
            listing_url: 'https://www.the1916company.com/rolex/submariner/m124060-0001/',
            dealer: '1916 Company (ex-WatchBox)',
            condition: 'pre-owned',
            year: null,
            location: 'US',
            scraped_at: '2026-06-21T20:03:01.021Z',
            country: 'US',
        },
        ...overrides,
    };
}

function makeCrossCountrySpread(overrides: Partial<CrossCountrySpread> = {}): CrossCountrySpread {
    const opportunity = makeOpportunity();
    return {
        ref: '124060',
        brand: 'rolex',
        from: {
            country: 'US',
            cheapest_price_usd: 10050,
            listing: opportunity.listing,
            sample_size: 1,
        },
        to: {
            country: 'EU',
            cheapest_price_usd: 11754,
            listing: { ...opportunity.listing, platform: 'chrono24', price_usd: 11754, country: 'EU' },
            sample_size: 2,
        },
        gap_usd: 1704,
        gap_pct: 14.5,
        detected_at: '2026-06-21T20:03:02.475Z',
        ...overrides,
    };
}

beforeEach(() => {
    actorCall.mockReset();
    actorCharge.mockReset();
    actorGetValue.mockReset();
    actorSetValue.mockReset();
    logError.mockReset();
    logWarning.mockReset();
    actorGetValue.mockResolvedValue(null);
    actorSetValue.mockResolvedValue(undefined);
    actorCall.mockResolvedValue({});
    actorCharge.mockResolvedValue({});
});

describe('email alert dispatch', () => {
    it('sends one digest email for cross-platform opportunities', async () => {
        const result = await dispatchAlerts([makeOpportunity()], { email: 'dealer@example.com' });

        expect(result.email_sent).toBe(true);
        expect(actorCall).toHaveBeenCalledOnce();
        expect(actorCall).toHaveBeenCalledWith(
            'apify/send-mail',
            expect.objectContaining({
                to: 'dealer@example.com',
                subject: expect.stringContaining('Watch arbitrage alert'),
                html: expect.stringContaining('Rolex'),
            }),
        );
    });

    it('sends one digest email for cross-country spreads', async () => {
        const result = await dispatchCrossCountryAlerts([makeCrossCountrySpread()], { email: 'dealer@example.com' });

        expect(result.email_sent).toBe(true);
        expect(actorCall).toHaveBeenCalledOnce();
        expect(actorCall).toHaveBeenCalledWith(
            'apify/send-mail',
            expect.objectContaining({
                to: 'dealer@example.com',
                subject: expect.stringContaining('Cross-country watch spread'),
                html: expect.stringContaining('United States'),
            }),
        );
    });
});
