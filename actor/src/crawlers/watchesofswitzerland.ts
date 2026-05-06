/**
 * Watches of Switzerland crawler.
 *
 * Authorized retail chain (UK + US). Largest luxury watch retailer in the
 * UK; absorbing Hodinkee Shop's pre-owned inventory under the WoS Group
 * banner. Lower arbitrage potential than dealer marketplaces (retail prices
 * tend to anchor MSRP) but maximises coverage as a price-floor reference.
 *
 * Anti-bot: light. Site uses Tailwind utility classes; structure is stable
 * via `div.w-full.group.relative.flex.flex-col` wrappers.
 *
 * Live-DOM verified 2026-05-04 against
 *   https://www.watchesofswitzerland.com/en-int/search?q=rolex+daytona
 *   → 24 product cards (51 results headline; 24 visible above-the-fold pre-pagination).
 *
 * Card structure (verified):
 *   <div class="w-full group relative flex flex-col ...">
 *     <a href="/en-int/products/{slug-and-id}">
 *       <span class="sr-only">{title}</span>
 *       <img alt="{title}" ...>
 *     </a>
 *     <div class="flex flex-col flex-1">                ← inner content wrapper
 *       <a href="/en-int/products/{...}">{title}</a>
 *       <span class="p">$12,500</span>                  ← price
 *
 * Notes:
 * - The site geo-routes to USD on `en-int`. fx.ts handles GBP/USD/EUR
 *   transparently if a different locale lands.
 * - Patek pricing is hidden ("price on request") — those listings are
 *   discarded by the no-price filter. Rolex and most other brands display.
 * - WoS UK domain (`watches-of-switzerland.com`) is geo-blocked from some
 *   regions; the urlbuilder uses `watchesofswitzerland.com/en-int` which
 *   serves globally.
 * - Year + condition not on card. WoS sells both new and pre-owned; we
 *   default condition='' and let downstream fillers set it.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD = 'div.w-full.group.relative.flex.flex-col';
const SEL_LINK = 'a[href*="/products/"]';
const SEL_PRICE = 'span.p';

export async function watchesofswitzerlandHandler(
    ctx: PlaywrightCrawlingContext,
    maxListings: number,
): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD, { timeout: 25_000 });
    } catch {
        log.warning(`watchesofswitzerland: no cards rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD);
    log.info(`watchesofswitzerland: ${cards.length} cards pre-filter for ref="${ref}"`);
    const out: Listing[] = [];

    // 2026-05-06: brand-grid platforms show BASE refs in titles, not sub-variants.
    // Match base prefix; aggregator groups by extracted sub-ref afterward.
    // See europeanwatch.ts comment for full rationale.
    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const baseMatch = refLower.replace(/[^\w]/g, '').match(/^(\d{4,6}[a-z]{0,3})/);
    const basePrefix = baseMatch ? baseMatch[1] : refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            const link = await card.$(SEL_LINK);
            if (!link) continue;

            const href = (await link.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;
            const title = (await link.evaluate((el) => (el.textContent ?? '').trim()).catch(() => '')) || '';

            const priceEl = await card.$(SEL_PRICE);
            if (!priceEl) continue; // no price → "request quote" Patek tier; skip
            const priceRaw = (await priceEl.evaluate((el) => (el.textContent ?? '').trim()).catch(() => '')) || '';

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            if (isStrictRef) {
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(basePrefix)) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'watchesofswitzerland',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Watches of Switzerland',
                condition: '', // not on card; can be new or pre-owned
                year: null,
                location: parsed.currency === 'GBP' ? 'UK' : 'US',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`watchesofswitzerland: card parse failed`, { err: String(err) });
        }
    }

    log.info(`watchesofswitzerland: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
