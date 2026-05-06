/**
 * Hodinkee Shop crawler.
 *
 * DEPRECATED: Hodinkee Shop winding down (acquired by Watches of Switzerland
 * Group). Replaced by 3 new platforms 2026-05-04 (Watchfinder UK,
 * European Watch Co, Watches of Switzerland). File kept for backward compat
 * if old runs reference 'hodinkee' in the platforms input array — the
 * enum still accepts it. Removed from input_schema default platforms list.
 *
 * Shopify-based store. No anti-bot blocking — standard Apify proxy fine.
 *
 * !!! Inventory caveat (verified 2026-05-04) !!!
 * Hodinkee announced the merger with Watches of Switzerland; almost the
 * entire pre-owned inventory is marked SOLD on /collections/all and the
 * /search?q=rolex query returns "0 results found". The crawler will run
 * cleanly but is unlikely to produce many live arbitrage data points until
 * (or unless) inventory returns.
 *
 * Live-DOM verified 2026-05-04 against
 *   https://shop.hodinkee.com/collections/all
 * → 48 product cards in DOM (most marked Sold via .pc-dot-danger).
 *
 * Card structure (verified):
 *   <a class="pc " href="/collections/all/products/{slug}">
 *     <div class="pc-images pc-has-hover">
 *       <div class="pc-image"><img class="lazyload" alt="{title}" .../></div>
 *     </div>
 *     <div class="pc-brand-2 lg:pc-brand-1">{brand}</div>
 *     <div class="pc-description-2 lg:pc-description-1">{title}</div>
 *     <div class="pc-price-2 lg:pc-price-1">$1,500</div>
 *     <div class="pc-status-container">
 *       <span class="pc-dot pc-dot-danger"></span>
 *       <div class="pc-status-2 lg:pc-status-1">Sold</div>
 *
 * Notes:
 * - We skip Sold listings (`.pc-dot-danger` present) — arbitrage requires
 *   buyable inventory. This will frequently return 0 listings until
 *   inventory returns.
 * - Year + condition not on card.
 * - Hodinkee titles often start with the year ("1930s ...", "1940 ..."),
 *   we extract that as a year hint when present.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD = 'a.pc';
const SEL_BRAND = '.pc-brand-2, .pc-brand-1';
const SEL_TITLE = '.pc-description-2, .pc-description-1';
const SEL_PRICE = '.pc-price-2, .pc-price-1';
const SEL_SOLD_DOT = '.pc-dot-danger';

function extractYearFromTitle(title: string): number | null {
    // Match "1930s", "1940 ...", "1965 ..." at start of title.
    const m = title.match(/\b(19|20)\d{2}\b/);
    if (!m) return null;
    const y = parseInt(m[0], 10);
    return y >= 1900 && y <= new Date().getFullYear() ? y : null;
}

export async function hodinkeeHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD, { timeout: 20_000 });
    } catch {
        log.warning(`hodinkee: no products rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD);
    const out: Listing[] = [];
    let skippedSold = 0;

    for (const card of cards.slice(0, maxListings)) {
        try {
            // Skip Sold-out listings; arbitrage requires buyable inventory.
            const isSold = await card.$(SEL_SOLD_DOT);
            if (isSold) {
                skippedSold++;
                continue;
            }

            const brand = (await card.$eval(SEL_BRAND, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const title = (await card.$eval(SEL_TITLE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const priceRaw = (await card.$eval(SEL_PRICE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;

            // Hodinkee's catalogue is broad; do a fuzzy ref-digit guard so we
            // don't push unrelated SKUs into the dataset.
            const refDigits = ref.replace(/\D/g, '');
            const fullText = `${brand} ${title}`;
            if (refDigits && !fullText.replace(/\D/g, '').includes(refDigits.slice(0, 4))) {
                continue;
            }

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'hodinkee',
                title: [brand, title].filter(Boolean).join(' ').trim(),
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Hodinkee Shop',
                condition: 'pre-owned',
                year: extractYearFromTitle(title),
                location: 'US',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`hodinkee: card parse failed`, { err: String(err) });
        }
    }

    log.info(`hodinkee: extracted ${out.length} listings (skipped ${skippedSold} sold) for ref="${ref}"`);
    return out;
}
