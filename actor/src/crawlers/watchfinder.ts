/**
 * Watchfinder UK crawler.
 *
 * UK leader (~10K inventory across all major brands), owned by Richemont
 * since 2018. Largest dealer network in Europe.
 *
 * Anti-bot: light. Standard Apify proxy + Camoufox handles. No Cloudflare
 * interstitial encountered on recon 2026-05-04.
 *
 * Live-DOM verified 2026-05-04 against
 *   https://www.watchfinder.co.uk/Rolex/Daytona/watches → 45 listings rendered
 *   https://www.watchfinder.co.uk/Patek+Philippe/Nautilus/watches → 16 listings
 *
 * Card structure (verified):
 *   <a class="product-card large" href="/{Brand}/{Series}/{Ref}/{N}/item/{ID}">
 *     <div class="card-brand">Rolex</div>
 *     <div class="card-series weight-strong truncate">Daytona</div>
 *     <div class="card-model-number truncate">116503</div>
 *     <span class="card-year weight-semibold">Year</span><span>2022</span>
 *     <span class="card-price weight-strong">£17,175</span>
 *     <span class="card-box ...">Box</span><span class="card-papers ...">Papers</span>
 *
 * Notes:
 * - Currency is GBP for the UK domain. fx.ts has GBP rate.
 * - Watchfinder's free-text search (`/wsearch?q=...`) returns "No Results
 *   Found" for ref-style queries; the canonical inventory pages use
 *   `/{Brand}/{Series}/watches` (e.g. `/Rolex/Daytona/watches`,
 *   `/Patek+Philippe/Nautilus/watches`). The url builder maps refs accordingly.
 * - Year is on the card (good signal — most other platforms hide it).
 * - Box/papers presence is on the card too; we don't extract these into the
 *   shared Listing schema yet but they're available for future enrichment.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD = 'a.product-card';
const SEL_BRAND = '.card-brand';
const SEL_SERIES = '.card-series';
const SEL_REF = '.card-model-number';
const SEL_PRICE = '.card-price';
const SEL_YEAR = '.card-year';

function parseYearText(txt: string): number | null {
    const m = txt.match(/(19|20)\d{2}/);
    if (!m) return null;
    const y = parseInt(m[0], 10);
    return y >= 1900 && y <= new Date().getFullYear() ? y : null;
}

export async function watchfinderHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD, { timeout: 25_000 });
    } catch {
        log.warning(`watchfinder: no cards rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD);
    log.info(`watchfinder: ${cards.length} cards found pre-filter for ref="${ref}"`);
    const out: Listing[] = [];

    // 2026-05-06: brand-grid platforms (watchfinder/europeanwatch/WoS) show BASE
    // refs in titles, not sub-variants. Match base prefix; aggregator groups by
    // extracted sub-ref afterward. See europeanwatch.ts comment for full rationale.
    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const baseMatch = refLower.replace(/[^\w]/g, '').match(/^(\d{4,6}[a-z]{0,3})/);
    const basePrefix = baseMatch ? baseMatch[1] : refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            const brand = (await card.$eval(SEL_BRAND, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const series = (await card.$eval(SEL_SERIES, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const refNo = (await card.$eval(SEL_REF, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const priceRaw = (await card.$eval(SEL_PRICE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;
            // Year sits in the sibling span next to .card-year label; pull both spans' text.
            const yearText =
                (await card
                    .$$eval('.card-year, .card-year + span', (els) => els.map((e) => e.textContent ?? '').join(' '))
                    .catch(() => '')) || '';
            const year = parseYearText(yearText);

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            const title = [brand, series, refNo].filter(Boolean).join(' ').trim();

            if (isStrictRef) {
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(basePrefix)) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'watchfinder',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Watchfinder',
                condition: 'pre-owned', // Watchfinder is pre-owned by definition
                year,
                location: 'UK',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`watchfinder: card parse failed`, { err: String(err) });
        }
    }

    log.info(`watchfinder: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
