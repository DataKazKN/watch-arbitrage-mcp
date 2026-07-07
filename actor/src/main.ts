/**
 * WatchArb — Cross-platform watch arbitrage tracker (Patek/Rolex/AP).
 *
 * Two modes (one binary):
 *   1. Batch (default) — read input.references, crawl 6 platforms, save dataset
 *      + KV (MARKET_SNAPSHOT, ARBITRAGE_OPPORTUNITIES), dispatch alerts. Used
 *      by `apify call ...` and Apify Schedules.
 *   2. Standby/MCP — start an HTTP server (REST + MCP JSON-RPC) that answers
 *      live queries against the cached batch run. Triggered when
 *      `Actor.config.get('metaOrigin') === 'STANDBY'` (Apify sets this when a
 *      run is started in Standby mode).
 *
 * Batch flow per run:
 *   1. read input (refs, platforms, thresholds, alert config)
 *   2. spin one Camoufox-Playwright crawler over all 4 platforms in parallel
 *   3. push raw listings to dataset
 *   4. aggregate (median per ref) → detect spreads ≥ min_spread_pct
 *   5. dispatch alerts (Telegram + email) with 24h dedup
 *   6. write summaries to KV: ARBITRAGE_OPPORTUNITIES + MARKET_SNAPSHOT
 */
import { setTimeout as sleep } from 'node:timers/promises';

import { PlaywrightCrawler, type PlaywrightCrawlingContext } from '@crawlee/playwright';
import { Actor, log } from 'apify';
import { launchOptions as camoufoxLaunchOptions } from 'camoufox-js';
import { firefox } from 'playwright';

import {
    aggregate,
    annotateCountries,
    applyFilters,
    computeCrossCountrySpread,
    detectOpportunities,
    filterByRefMatch,
} from './aggregator.js';
import { dispatchAlerts, dispatchCrossCountryAlerts } from './alerts.js';
import { chargeReferenceMonitoring } from './billing.js';
import { acollectedmanHandler } from './crawlers/acollectedman.js';
import { analogshiftHandler } from './crawlers/analogshift.js';
import { bachmannscherHandler } from './crawlers/bachmannscher.js';
import { bobsHandler } from './crawlers/bobs.js';
import { chrono24Handler } from './crawlers/chrono24.js';
import { europeanwatchHandler } from './crawlers/europeanwatch.js';
import { hodinkeeHandler } from './crawlers/hodinkee.js';
import { spliedtHandler } from './crawlers/spliedt.js';
import { watchboxHandler } from './crawlers/watchbox.js';
import { watchclubHandler } from './crawlers/watchclub.js';
import { watchesofswitzerlandHandler } from './crawlers/watchesofswitzerland.js';
import { watchfinderHandler } from './crawlers/watchfinder.js';
import { yahoojpHandler } from './crawlers/yahoojp.js';
import { buildRunEconomicsReport, normalizeRevenuePlan, shouldStopForEconomics } from './economics.js';
import type { ActorInput, Listing, Platform } from './types.js';
import { buildSearchUrls } from './utils/url.js';

await Actor.init();

// --- Mode detection (Standby vs Batch) ---
const metaOrigin = Actor.config.get('metaOrigin');
const isStandby = metaOrigin === 'STANDBY';

if (isStandby) {
    log.info('[main] Starting in Standby/MCP mode (HTTP server)');
    const { startStandbyServer } = await import('./server.js');
    await startStandbyServer();
    // Server blocks forever — never returns. Actor.exit() handled in 'aborting'.
} else {
    log.info('[main] Starting in batch crawl mode');
    await runBatch();
    await Actor.exit();
}

function parseOptionalUsd(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

async function runBatch(): Promise<void> {
    // --- Graceful abort handling (per AGENTS.md) ---
    Actor.on('aborting', async () => {
        log.warning('Actor aborting — persisting state and exiting');
        await sleep(1_000);
        await Actor.exit();
    });

    // --- Read + validate input ---
    const input = (await Actor.getInput<ActorInput>()) ?? ({} as ActorInput);
    const references = (input.references ?? []).map((r) => r.trim()).filter(Boolean);
    const platforms: Platform[] = input.platforms?.length
        ? input.platforms
        : ['chrono24', 'watchbox', 'bobs', 'watchfinder', 'europeanwatch', 'watchesofswitzerland'];
    // ---- Spread sensitivity ----
    // Single `number` field in the schema (minimum 0.5, maximum 50, default 5).
    // We still defensively coerce + clamp because Apify input can arrive as
    // string (older runs) or out-of-range when a user edits the JSON directly.
    const rawSpread = Number.parseFloat(String(input.spread_sensitivity ?? '5'));
    const minSpreadPct = Math.min(50, Math.max(0.5, Number.isFinite(rawSpread) ? rawSpread : 5));

    // ---- Per-reference price ceilings (override median anchor for listed refs) ----
    const priceCeilings = input.price_ceilings ?? [];
    const maxListingsPerRefPerPlatform = input.max_listings_per_ref_per_platform ?? 10;

    if (references.length === 0) {
        log.error('Input "references" is empty — nothing to do.');
        await Actor.exit({ exitCode: 1 });
    }

    log.info('WatchArb starting', {
        references_count: references.length,
        platforms,
        min_spread_pct: minSpreadPct,
        price_ceilings_count: priceCeilings.length,
    });

    const alertChannel = String(input.alert_channel ?? 'telegram');
    const expectsTelegramAlerts = alertChannel === 'telegram' || alertChannel === 'both';
    const expectsEmailAlerts = alertChannel === 'email' || alertChannel === 'both';
    const hasTelegramCredentials = Boolean(input.alert_telegram_bot_token && input.alert_telegram_chat_id);
    const hasEmailDestination = Boolean(input.alert_email);
    const hasAlertDestination =
        (expectsTelegramAlerts && hasTelegramCredentials) || (expectsEmailAlerts && hasEmailDestination);
    const expectedSpreadAlertsOverride = parseOptionalUsd(process.env.WATCHARB_EXPECTED_SPREAD_ALERTS);
    const minNetCoverageRatio = parseOptionalUsd(process.env.WATCHARB_MIN_NET_COVERAGE_RATIO);
    const economicsReport = buildRunEconomicsReport({
        referencesCount: references.length,
        platforms,
        maxListingsPerRefPerPlatform,
        alertChannel: hasAlertDestination ? 'telegram' : 'dataset_only',
        hasTelegramCredentials: hasAlertDestination,
        expectedPaidSpreadAlerts: expectedSpreadAlertsOverride,
        usesResidentialProxy: input.proxyConfiguration?.apifyProxyGroups?.includes('RESIDENTIAL') ?? false,
        revenuePlan: normalizeRevenuePlan(process.env.WATCHARB_REVENUE_PLAN),
        maxTotalChargeUsd: parseOptionalUsd(process.env.ACTOR_MAX_TOTAL_CHARGE_USD),
        minNetCoverageRatio,
    });
    const economicsDecision = shouldStopForEconomics(economicsReport);
    log.info('Run economics preflight', { ...economicsReport, decision: economicsDecision });
    if (economicsDecision.stop && process.env.WATCHARB_ALLOW_UNPROFITABLE_RUN !== '1') {
        await Actor.setValue('ECONOMICS_GUARD', { report: economicsReport, decision: economicsDecision });
        log.warning('Stopping before crawl because projected run economics are below guard threshold.', {
            reason: economicsDecision.reason,
        });
        await Actor.exit({ exitCode: 0 });
        return;
    }
    if (economicsDecision.stop) {
        log.warning('WATCHARB_ALLOW_UNPROFITABLE_RUN=1 set. Continuing despite economics guard.', {
            reason: economicsDecision.reason,
        });
    }

    // Charge actor-start + check spending limit (respect ACTOR_MAX_TOTAL_CHARGE_USD).
    const startCharge = await Actor.charge({ eventName: 'actor-start' }).catch(() => null);
    if (startCharge?.eventChargeLimitReached) {
        log.warning('User spending limit reached on actor-start. Exiting gracefully.');
        await Actor.exit({ exitCode: 0 });
    }

    const monitoringBilling = await chargeReferenceMonitoring(references, {
        charge: async (payload) => Actor.charge(payload),
        warn: (message) => log.warning(message),
    });
    const monitoredReferences = monitoringBilling.referencesToMonitor;
    if (monitoringBilling.limitReached) {
        log.warning('Reference monitoring billing limit reached. Continuing only with references that were charged.', {
            requested_references_count: references.length,
            charged_references_count: monitoringBilling.chargedReferencesCount,
        });
    }
    if (monitoredReferences.length === 0) {
        await Actor.setValue('REFERENCE_MONITORING_GUARD', {
            requested_references: references,
            charged_references_count: 0,
            reason: 'No references cleared the reference-monitored charge; crawl skipped to avoid unpaid compute.',
        });
        log.warning('No references cleared reference-monitored billing. Exiting before crawl.');
        await Actor.exit({ exitCode: 0 });
        return;
    }

    // --- Build cross-platform request list ---
    type PlatformRequest = { url: string; userData: { ref: string; platform: Platform } };
    const allRequests: PlatformRequest[] = [];
    for (const platform of platforms) {
        for (const r of buildSearchUrls(platform, monitoredReferences)) {
            allRequests.push({ url: r.url, userData: { ref: r.userData.ref, platform } });
        }
    }
    log.info(`Queued ${allRequests.length} search requests`, {
        requested_references_count: references.length,
        monitored_references_count: monitoredReferences.length,
    });

    // --- One crawler with router-style dispatch by platform ---
    const collected: Listing[] = [];

    // Honor the `proxyConfiguration` input field (schema editor: "proxy").
    // Falls back to default Apify proxy when the field is omitted.
    const proxyConfiguration = await Actor.createProxyConfiguration({
        ...(input.proxyConfiguration ?? {}),
        checkAccess: false,
    });

    const crawler = new PlaywrightCrawler({
        proxyConfiguration,
        maxRequestsPerCrawl: allRequests.length + 5,
        maxConcurrency: 6,
        navigationTimeoutSecs: 60,
        requestHandlerTimeoutSecs: 90,
        launchContext: {
            launcher: firefox,
            launchOptions: await camoufoxLaunchOptions({
                headless: true,
                proxy: await proxyConfiguration?.newUrl(),
                geoip: true,
            }),
        },
        requestHandler: async (ctx: PlaywrightCrawlingContext) => {
            const platform = ctx.request.userData?.platform as Platform | undefined;
            if (!platform) {
                log.warning(`Request missing platform userData`, { url: ctx.request.url });
                return;
            }

            let listings: Listing[] = [];
            try {
                switch (platform) {
                    case 'chrono24':
                        listings = await chrono24Handler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'watchbox':
                        listings = await watchboxHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'bobs':
                        listings = await bobsHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'hodinkee':
                        listings = await hodinkeeHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'watchfinder':
                        listings = await watchfinderHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'europeanwatch':
                        listings = await europeanwatchHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'watchesofswitzerland':
                        listings = await watchesofswitzerlandHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    // ── extra sources (added 2026-05-17) ──
                    case 'watchclub':
                        listings = await watchclubHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'yahoojp':
                        listings = await yahoojpHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'spliedt':
                        listings = await spliedtHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'acollectedman':
                        listings = await acollectedmanHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    // ── extra sources (added 2026-05-18) ──
                    case 'analogshift':
                        listings = await analogshiftHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    case 'bachmannscher':
                        listings = await bachmannscherHandler(ctx, maxListingsPerRefPerPlatform);
                        break;
                    default:
                        log.warning(`Unsupported platform`, { platform });
                        return;
                }
            } catch (err) {
                log.error(`${platform} handler crashed`, { err: String(err), url: ctx.request.url });
                return;
            }

            if (listings.length > 0) {
                // Annotate with country at push time so the dataset row carries
                // the same `country` field as KV stores (MARKET_SNAPSHOT,
                // ARBITRAGE_OPPORTUNITIES, CROSS_COUNTRY_SPREADS). Previously
                // pushData ran on raw listings (country=null in dataset) while
                // KV stores ran on the post-annotateCountries pipeline.
                const enriched = annotateCountries(listings);
                collected.push(...enriched);
                await Actor.pushData(enriched);
                log.info(`${platform}: +${listings.length} listings for ref=${ctx.request.userData?.ref}`);
            }
        },
        failedRequestHandler: ({ request }, error) => {
            log.warning(`Request failed (giving up)`, {
                url: request.url,
                err: error.message,
            });
        },
    });

    await crawler.run(allRequests);

    log.info(`Crawl complete — ${collected.length} total listings collected`);

    // --- Bug #4 fix: filter false positives for model-name refs (Daytona/Submariner/etc.) ---
    const matched = filterByRefMatch(collected);
    if (matched.length !== collected.length) {
        log.info(
            `Ref-match filter: ${collected.length} → ${matched.length} listings (dropped ${collected.length - matched.length} model-name false positives)`,
        );
    }

    // --- Apply user filters (condition + box/papers + strict mode) ---
    const filterConditions = input.filter_conditions;
    const filterBoxPapers = input.filter_box_papers;
    const strictConditionMatching = input.strict_condition_matching ?? false;
    const filtered = applyFilters(matched, filterConditions, filterBoxPapers, strictConditionMatching);
    if (filtered.length !== matched.length) {
        log.info(`User filters applied: ${matched.length} → ${filtered.length} listings`, {
            filter_conditions: filterConditions ?? 'all',
            filter_box_papers: filterBoxPapers ?? 'all',
            strict_condition_matching: strictConditionMatching,
        });
    }

    // --- Annotate country before aggregation so cross_country_pair mode has data ---
    const enriched = annotateCountries(filtered);

    // --- Aggregate + detect spreads on FILTERED listings ---
    const { stats } = aggregate(enriched);
    const opportunities = detectOpportunities(enriched, stats, minSpreadPct, priceCeilings);

    // --- Cross-country spreads (always computed; only alerted in cross_country_pair mode) ---
    const compareMode = input.compare_mode ?? 'cross_platform_global';
    const refsWithData = Array.from(new Set(enriched.map((l) => l.ref)));
    const allCrossCountry = refsWithData.flatMap((r) => computeCrossCountrySpread(enriched, r));
    // Keep only spreads that meet the user's sensitivity threshold (same %, simpler UX).
    const significantCrossCountry = allCrossCountry.filter((s) => s.gap_pct >= minSpreadPct);
    // Top-1 widest gap per ref → avoids spamming Telegram with every country pair.
    const topPerRef = new Map<string, (typeof significantCrossCountry)[number]>();
    for (const s of significantCrossCountry) {
        const cur = topPerRef.get(s.ref);
        if (!cur || s.gap_pct > cur.gap_pct) topPerRef.set(s.ref, s);
    }
    const crossCountryAlerts = Array.from(topPerRef.values());

    await Actor.setValue('MARKET_SNAPSHOT', stats);
    await Actor.setValue('ARBITRAGE_OPPORTUNITIES', opportunities);
    await Actor.setValue('CROSS_COUNTRY_SPREADS', allCrossCountry);

    log.info(`Aggregation done`, {
        refs_with_data: stats.length,
        opportunities_detected: opportunities.length,
        cross_country_spreads_all: allCrossCountry.length,
        cross_country_alerts_top: crossCountryAlerts.length,
        compare_mode: compareMode,
    });

    // --- Dispatch alerts ---
    // Mode dictates which alert pipeline runs. `cross_platform_global` is the
    // default and matches v0.1 behavior; `cross_country_pair` uses the new
    // country-aware format. `per_country` is reserved for v0.3.
    const alertConfig = {
        telegramBotToken: expectsTelegramAlerts ? input.alert_telegram_bot_token : undefined,
        telegramChatId: expectsTelegramAlerts ? input.alert_telegram_chat_id : undefined,
        email: expectsEmailAlerts ? input.alert_email : undefined,
    };

    if (compareMode === 'cross_country_pair') {
        const alertResult = await dispatchCrossCountryAlerts(crossCountryAlerts, alertConfig);
        log.info(`Cross-country alerts dispatched`, alertResult);
        const actualEconomicsReport = buildRunEconomicsReport({
            referencesCount: monitoredReferences.length,
            platforms,
            maxListingsPerRefPerPlatform,
            alertChannel: hasAlertDestination ? 'telegram' : 'dataset_only',
            hasTelegramCredentials: hasAlertDestination,
            expectedDatasetItems: collected.length,
            expectedPaidSpreadAlerts: alertResult.telegram_sent,
            usesResidentialProxy: input.proxyConfiguration?.apifyProxyGroups?.includes('RESIDENTIAL') ?? false,
            revenuePlan: normalizeRevenuePlan(process.env.WATCHARB_REVENUE_PLAN),
            maxTotalChargeUsd: parseOptionalUsd(process.env.ACTOR_MAX_TOTAL_CHARGE_USD),
            minNetCoverageRatio,
        });
        log.info('Run economics actual estimate', actualEconomicsReport);
        await Actor.setValue('RUN_ECONOMICS', actualEconomicsReport);
    } else {
        // Default: cross_platform_global (also covers per_country until v0.3 ships).
        const alertResult = await dispatchAlerts(opportunities, alertConfig);
        log.info(`Alerts dispatched`, alertResult);
        const actualEconomicsReport = buildRunEconomicsReport({
            referencesCount: monitoredReferences.length,
            platforms,
            maxListingsPerRefPerPlatform,
            alertChannel: hasAlertDestination ? 'telegram' : 'dataset_only',
            hasTelegramCredentials: hasAlertDestination,
            expectedDatasetItems: collected.length,
            expectedPaidSpreadAlerts: alertResult.telegram_sent,
            usesResidentialProxy: input.proxyConfiguration?.apifyProxyGroups?.includes('RESIDENTIAL') ?? false,
            revenuePlan: normalizeRevenuePlan(process.env.WATCHARB_REVENUE_PLAN),
            maxTotalChargeUsd: parseOptionalUsd(process.env.ACTOR_MAX_TOTAL_CHARGE_USD),
            minNetCoverageRatio,
        });
        log.info('Run economics actual estimate', actualEconomicsReport);
        await Actor.setValue('RUN_ECONOMICS', actualEconomicsReport);
    }
}
