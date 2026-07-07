import { describe, expect, it } from 'vitest';

import { buildRunEconomicsReport, shouldStopForEconomics } from '../src/economics.js';
import type { Platform } from '../src/types.js';

const DEFAULT_PLATFORMS: Platform[] = [
    'chrono24',
    'watchbox',
    'bobs',
    'watchfinder',
    'europeanwatch',
    'watchesofswitzerland',
];

describe('run economics guard', () => {
    it('uses live Free/Bronze pricing by default so profitable one-platform starter runs are not blocked', () => {
        const report = buildRunEconomicsReport({
            referencesCount: 10,
            platforms: ['bobs'],
            maxListingsPerRefPerPlatform: 1,
            alertChannel: 'dataset_only',
            hasTelegramCredentials: false,
        });

        expect(report.revenuePlan).toBe('free_bronze');
        expect(report.estimatedGrossRevenueUsd).toBeCloseTo(0.5101, 4);
        expect(report.estimatedNetAfterApifyUsd).toBeGreaterThan(report.estimatedUsageCostUsd * report.minNetCoverageRatio);
        expect(shouldStopForEconomics(report).stop).toBe(false);
    });

    it('blocks the observed $0.16 compute / ~$0.20 gross dataset-only shape on Gold+', () => {
        const report = buildRunEconomicsReport({
            referencesCount: 6,
            platforms: DEFAULT_PLATFORMS,
            maxListingsPerRefPerPlatform: 25,
            alertChannel: 'dataset_only',
            hasTelegramCredentials: false,
            revenuePlan: 'gold_plus',
        });

        expect(report.estimatedGrossRevenueUsd).toBeCloseTo(0.1926, 4);
        expect(report.estimatedNetAfterApifyUsd).toBeCloseTo(0.154, 3);
        expect(report.estimatedUsageCostUsd).toBeGreaterThanOrEqual(0.16);
        expect(shouldStopForEconomics(report).stop).toBe(true);
    });

    it('blocks residential proxy runs unless expected revenue clearly covers the proxy cost', () => {
        const report = buildRunEconomicsReport({
            referencesCount: 1,
            platforms: [
                'chrono24',
                'watchbox',
                'bobs',
                'watchfinder',
                'europeanwatch',
                'watchesofswitzerland',
                'hodinkee',
                'watchclub',
                'spliedt',
                'acollectedman',
                'analogshift',
                'bachmannscher',
            ],
            maxListingsPerRefPerPlatform: 5,
            alertChannel: 'dataset_only',
            hasTelegramCredentials: false,
            usesResidentialProxy: true,
            revenuePlan: 'gold_plus',
        });

        expect(report.estimatedUsageCostUsd).toBeGreaterThan(0.4);
        expect(shouldStopForEconomics(report).stop).toBe(true);
    });

    it('passes a Telegram value run when one expected paid spread alert covers compute', () => {
        const report = buildRunEconomicsReport({
            referencesCount: 3,
            platforms: DEFAULT_PLATFORMS,
            maxListingsPerRefPerPlatform: 12,
            alertChannel: 'telegram',
            hasTelegramCredentials: true,
            expectedPaidSpreadAlerts: 1,
            revenuePlan: 'gold_plus',
        });

        expect(report.estimatedPaidSpreadAlerts).toBe(1);
        expect(report.estimatedNetAfterApifyUsd).toBeGreaterThan(report.estimatedUsageCostUsd);
        expect(shouldStopForEconomics(report).stop).toBe(false);
    });

    it('blocks when ACTOR_MAX_TOTAL_CHARGE_USD is lower than the break-even gross needed', () => {
        const report = buildRunEconomicsReport({
            referencesCount: 3,
            platforms: DEFAULT_PLATFORMS,
            maxListingsPerRefPerPlatform: 12,
            alertChannel: 'telegram',
            hasTelegramCredentials: true,
            expectedPaidSpreadAlerts: 1,
            revenuePlan: 'gold_plus',
            maxTotalChargeUsd: 0.1,
        });

        const decision = shouldStopForEconomics(report);

        expect(report.breakEvenGrossRevenueUsd).toBeGreaterThan(0.1);
        expect(decision.stop).toBe(true);
        expect(decision.reason).toContain('ACTOR_MAX_TOTAL_CHARGE_USD');
    });
});
