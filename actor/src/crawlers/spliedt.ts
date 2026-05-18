/**
 * H. Spliedt (Germany) crawler — verified v1.
 *
 * Site: https://www.spliedt.de/
 * Brand: H. Spliedt (locations Munich/Hamburg/Sylt) · founded 1857
 * Country: DE
 * Currency: EUR (German format: dots-thousands, comma-decimal — "€85.000,00")
 *
 * Live DOM verified 2026-05-17 against:
 *   https://www.spliedt.de/collections/patek-philippe (19 product cards, EUR)
 *
 * Card structure (verified):
 *   <div class="product-card product-heritage-card ...">
 *     <a href="/products/{slug}"></a>
 *     [textContent contains:] Patek Philippe{Title} ... Angebotspreis€{price}
 *   </div>
 *
 * Notes:
 * - Inventory mix: premium Patek/Rolex/AP, mostly full-set with papers
 * - Pricing format: "€85.000,00" — handled by parsePrice (EU thousands)
 * - URL slug often includes year + condition: useful for `year` extraction
 * - Strict-ref filter via title substring (same approach as europeanwatch)
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD_SELECTOR = '.product-card';
const PRODUCT_LINK_SELECTOR = 'a[href*="/products/"]';

export async function spliedtHandler(
    ctx: PlaywrightCrawlingContext,
    maxListings: number,
): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_SELECTOR, { timeout: 25_000 });
    } catch {
        log.warning(`spliedt: no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD_SELECTOR);
    const out: Listing[] = [];

    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const refCore = refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            const href =
                (await card
                    .$eval(PRODUCT_LINK_SELECTOR, (el) => (el as HTMLAnchorElement).href)
                    .catch(() => '')) || request.url;
            const fullText = (await card.evaluate((el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const titleClean = fullText.replace(/\s+/g, ' ').slice(0, 250);

            // Price often appears as "Angebotspreis€85.000,00" — extract first €amount.
            const priceMatch = titleClean.match(/[€]\s*[\d.,]+/);
            if (!priceMatch) continue;

            const parsed = parsePrice(priceMatch[0]);
            if (!parsed) continue;

            if (isStrictRef) {
                const haystack = `${titleClean} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refCore)) continue;
            }

            // Year often in URL slug (...year-YYYY or just /YYYY).
            const yearMatch = href.match(/[-/](\d{4})(?:[/-]|$)/) || titleClean.match(/\b(20\d{2}|19\d{2})\b/);
            const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : null;

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'spliedt',
                title: titleClean,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'H. Spliedt',
                condition: '',
                year,
                location: 'DE',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`spliedt: card parse failed`, { err: String(err) });
        }
    }

    log.info(`spliedt: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
