/**
 * A Collected Man (London) crawler — verified v1.
 *
 * Site: https://www.acollectedman.com/
 * Brand: A Collected Man — UK premium pre-owned + horology archive
 * Country: UK
 * Currency: GBP (VAT excluded for UK)
 *
 * Live DOM verified 2026-05-17 against:
 *   https://www.acollectedman.com/collections/patek-philippe (222 products,
 *   majority marked "Sold" — most of inventory is archive)
 *
 * Card structure (verified):
 *   <div class="product-card product-card--alt ...">
 *     <a href="/products/{slug}"></a>
 *     <img alt="buy Patek Philippe {Model} {Ref} preowned watch ...">
 *     <... class="*price*">{Sold | £{amount}}</...>
 *   </div>
 *
 * Notes:
 * - Inventory is heavy on archive — most cards show "Sold"; crawler skips those
 * - Image alt-text contains rich title metadata (model + ref + condition)
 * - Strict-ref filter via alt-text + URL slug substring
 * - Country UK; GBP currency
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD_SELECTOR = '.product-card';
const PRODUCT_LINK_SELECTOR = 'a[href*="/products/"]';
const PRICE_SELECTOR = '[class*="price"], .money';
const IMG_SELECTOR = 'img[alt]';

export async function acollectedmanHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_SELECTOR, { timeout: 25_000 });
    } catch {
        log.warning(`acollectedman: no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD_SELECTOR);
    const out: Listing[] = [];

    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const refCore = refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            const priceRaw =
                (await card.$eval(PRICE_SELECTOR, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';

            // Skip Sold cards — archive inventory not relevant for live arbitrage.
            if (/^(SOLD|RESERVED|POA|ENQUIRE)/i.test(priceRaw)) continue;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            const href =
                (await card.$eval(PRODUCT_LINK_SELECTOR, (el) => (el as HTMLAnchorElement).href).catch(() => '')) ||
                request.url;

            // Title from img alt-text (richer than textContent in this site).
            const altText =
                (await card.$eval(IMG_SELECTOR, (el) => (el as HTMLImageElement).alt ?? '').catch(() => '')) || '';
            const title = altText
                .replace(/^buy\s+/i, '')
                .replace(/\s+at\s+A Collected Man.*$/i, '')
                .trim();

            if (isStrictRef) {
                const haystack = `${title} ${altText} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refCore)) continue;
            }

            // Year often in URL slug or alt-text.
            const yearMatch = href.match(/[-/](\d{4})(?:[/-]|$)/) || altText.match(/\b(19\d{2}|20\d{2})\b/);
            const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : null;

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'acollectedman',
                title: title.slice(0, 250),
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'A Collected Man London',
                condition: '',
                year,
                location: 'GB',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`acollectedman: card parse failed`, { err: String(err) });
        }
    }

    log.info(`acollectedman: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
