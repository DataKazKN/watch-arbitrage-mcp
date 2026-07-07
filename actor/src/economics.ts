import type { Platform } from './types.js';

export type RevenuePlan = 'free_bronze' | 'silver' | 'gold_plus';

export interface RunEconomicsInput {
    referencesCount: number;
    platforms: Platform[];
    maxListingsPerRefPerPlatform: number;
    alertChannel?: string;
    hasTelegramCredentials: boolean;
    usesResidentialProxy?: boolean;
    revenuePlan?: RevenuePlan;
    expectedPaidSpreadAlerts?: number;
    expectedDatasetItems?: number;
    maxTotalChargeUsd?: number;
    minNetCoverageRatio?: number;
}

export interface RunEconomicsReport {
    revenuePlan: RevenuePlan;
    referencesCount: number;
    platformsCount: number;
    searchRequestsCount: number;
    maxListingsPerRefPerPlatform: number;
    expectedDatasetItems: number;
    estimatedPaidSpreadAlerts: number;
    estimatedUsageCostUsd: number;
    estimatedGrossRevenueUsd: number;
    estimatedNetAfterApifyUsd: number;
    estimatedProfitUsd: number;
    breakEvenGrossRevenueUsd: number;
    minNetCoverageRatio: number;
    maxTotalChargeUsd?: number;
    usesResidentialProxy: boolean;
}

export interface RunEconomicsDecision {
    stop: boolean;
    reason: string;
}

const APIFY_MARGIN = 0.2;
const ACTOR_START_PRICE_USD = 0.00005;
const DATASET_ITEM_PRICE_USD = 0.001;
const DEFAULT_REVENUE_PLAN: RevenuePlan = 'free_bronze';
const DEFAULT_MIN_NET_COVERAGE_RATIO = 1.1;

const EXPECTED_LISTINGS_PER_SEARCH_REQUEST = 4.72;
const STANDARD_SEARCH_REQUEST_COST_USD = 0.0047;
const RESIDENTIAL_SEARCH_REQUEST_COST_USD = 0.0385;
const MIN_COLD_START_COST_USD = 0.03;

const REFERENCE_PRICE_USD: Record<RevenuePlan, number> = {
    free_bronze: 0.05,
    silver: 0.0045,
    gold_plus: 0.00375,
};

const SPREAD_ALERT_PRICE_USD: Record<RevenuePlan, number> = {
    free_bronze: 2,
    silver: 1.8,
    gold_plus: 1.5,
};

function roundUsd(value: number): number {
    return Math.round(value * 10_000) / 10_000;
}

function finiteNonNegative(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) && value! >= 0 ? value! : fallback;
}

export function normalizeRevenuePlan(value: string | undefined): RevenuePlan {
    const normalized = (value ?? '').toLowerCase().trim();
    if (normalized === 'free' || normalized === 'bronze' || normalized === 'free_bronze') return 'free_bronze';
    if (normalized === 'silver') return 'silver';
    if (normalized === 'gold' || normalized === 'platinum' || normalized === 'diamond' || normalized === 'gold_plus') {
        return 'gold_plus';
    }
    return DEFAULT_REVENUE_PLAN;
}

export function buildRunEconomicsReport(input: RunEconomicsInput): RunEconomicsReport {
    const revenuePlan = input.revenuePlan ?? DEFAULT_REVENUE_PLAN;
    const referencesCount = Math.max(0, Math.floor(input.referencesCount));
    const platformsCount = input.platforms.length;
    const searchRequestsCount = referencesCount * platformsCount;
    const maxListingsPerRefPerPlatform = Math.max(1, Math.floor(input.maxListingsPerRefPerPlatform || 1));
    const usesResidentialProxy = Boolean(input.usesResidentialProxy);

    const expectedDatasetItems = Math.max(
        0,
        Math.round(
            finiteNonNegative(
                input.expectedDatasetItems,
                searchRequestsCount * Math.min(maxListingsPerRefPerPlatform, EXPECTED_LISTINGS_PER_SEARCH_REQUEST),
            ),
        ),
    );
    const estimatedPaidSpreadAlerts = Math.max(
        0,
        Math.floor(
            finiteNonNegative(
                input.expectedPaidSpreadAlerts,
                input.alertChannel === 'telegram' && input.hasTelegramCredentials ? 1 : 0,
            ),
        ),
    );

    const searchRequestCostUsd = usesResidentialProxy
        ? RESIDENTIAL_SEARCH_REQUEST_COST_USD
        : STANDARD_SEARCH_REQUEST_COST_USD;
    const estimatedUsageCostUsd = roundUsd(
        Math.max(MIN_COLD_START_COST_USD, searchRequestsCount * searchRequestCostUsd),
    );
    const estimatedGrossRevenueUsd = roundUsd(
        ACTOR_START_PRICE_USD +
            referencesCount * REFERENCE_PRICE_USD[revenuePlan] +
            expectedDatasetItems * DATASET_ITEM_PRICE_USD +
            estimatedPaidSpreadAlerts * SPREAD_ALERT_PRICE_USD[revenuePlan],
    );
    const estimatedNetAfterApifyUsd = roundUsd(estimatedGrossRevenueUsd * (1 - APIFY_MARGIN));
    const minNetCoverageRatio = finiteNonNegative(input.minNetCoverageRatio, DEFAULT_MIN_NET_COVERAGE_RATIO);
    const breakEvenGrossRevenueUsd = roundUsd((estimatedUsageCostUsd * minNetCoverageRatio) / (1 - APIFY_MARGIN));

    return {
        revenuePlan,
        referencesCount,
        platformsCount,
        searchRequestsCount,
        maxListingsPerRefPerPlatform,
        expectedDatasetItems,
        estimatedPaidSpreadAlerts,
        estimatedUsageCostUsd,
        estimatedGrossRevenueUsd,
        estimatedNetAfterApifyUsd,
        estimatedProfitUsd: roundUsd(estimatedNetAfterApifyUsd - estimatedUsageCostUsd),
        breakEvenGrossRevenueUsd,
        minNetCoverageRatio,
        maxTotalChargeUsd: input.maxTotalChargeUsd,
        usesResidentialProxy,
    };
}

export function shouldStopForEconomics(report: RunEconomicsReport): RunEconomicsDecision {
    if (Number.isFinite(report.maxTotalChargeUsd) && report.maxTotalChargeUsd! < report.breakEvenGrossRevenueUsd) {
        return {
            stop: true,
            reason: `ACTOR_MAX_TOTAL_CHARGE_USD (${report.maxTotalChargeUsd}) is below break-even gross (${report.breakEvenGrossRevenueUsd}).`,
        };
    }

    const requiredNetRevenue = report.estimatedUsageCostUsd * report.minNetCoverageRatio;
    if (report.estimatedNetAfterApifyUsd < requiredNetRevenue) {
        return {
            stop: true,
            reason: `Estimated net revenue (${report.estimatedNetAfterApifyUsd}) is below required coverage (${roundUsd(requiredNetRevenue)}) for estimated usage cost (${report.estimatedUsageCostUsd}).`,
        };
    }

    return { stop: false, reason: 'Estimated run economics clear the preflight guard.' };
}
