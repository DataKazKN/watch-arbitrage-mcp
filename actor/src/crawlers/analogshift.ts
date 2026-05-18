/**
 * Analog:Shift (USA — NYC) crawler — verified v1.
 *
 * Site: https://www.analogshift.com/
 * Brand: Analog:Shift — US-based vintage & pre-owned specialist
 * Country: US
 * Currency: USD ($27,500 sample, native Shopify currency = USD)
 *
 * Live DOM verified 2026-05-18 against:
 *   https://www.analogshift.com/collections/patek-philippe (48 product cards,
 *   range $27,500 → $149,950 sample, large vintage inventory).
 *
 * Card structure (verified):
 *   <div class="card-wrapper">
 *     <a class="full-unstyled-link" href="/collections/patek-philippe/products/{slug}">
 *       <div class="card card--product">...</div>
 *       <div class="card-information__text">Patek Philippe {Model}</div>
 *       <span class="price-item--regular">$27,500</span>
 *     </a>
 *   </div>
 *
 * Notes:
 * - Shopify storefront. Same Liquid theme family as Spliedt/A Collected Man,
 *   different per-element classes. Some products have hover-image (.media--hover-effect).
 * - Title text format: "Patek Philippe Nautilus" (brand + family, not full ref).
 *   Reference codes appear in the URL slug as `-asXXXXX` (internal Analog:Shift IDs)
 *   so substring filtering against ref core is unreliable; we filter by ref core
 *   in URL OR in title (covering both vintage refs that appear in title and Analog
 *   internal IDs that don't).
 * - No Sold/Reserved badge convention seen in sample; assume all visible cards
 *   are live inventory. Will revisit if 0-result false-positives appear.
 * - Year extraction: not exposed in card; left null (operator can pull via detail
 *   page in future v0.2 enrichment).
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD_SELECTOR = '.card-wrapper';
const LINK_SELECTOR = 'a.full-unstyled-link';
const TITLE_SELECTOR = '.card-information__text, .caption-with-letter-spacing';
const PRICE_SELECTOR = '.price-item--regular, .price-item';

export async function analogshiftHandler(
    ctx: PlaywrightCrawlingContext,
    maxListings: number,
): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_SELECTOR, { timeout: 25_000 });
    } catch {
        log.warning(`analogshift: no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD_SELECTOR);
    const out: Listing[] = [];

    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const refCore = refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            // Pull the first matching price text — Shopify themes render multiple
            // .price-item nodes (regular + sale + visually-hidden); first non-empty wins.
            const priceCandidates = await card.$$eval(PRICE_SELECTOR, (els) =>
                els.map((el) => el.textContent?.trim() ?? '').filter(Boolean),
            );
            const priceRaw = priceCandidates.find((t) => /[$€£¥]/.test(t)) ?? '';
            if (!priceRaw) continue;

            // Skip placeholder states (uncommon on this site but defensive).
            if (/^(SOLD|RESERVED|POA|ENQUIRE|N\/A)/i.test(priceRaw)) continue;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            const href =
                (await card
                    .$eval(LINK_SELECTOR, (el) => (el as HTMLAnchorElement).href)
                    .catch(() => '')) || request.url;

            const title =
                (await card.$eval(TITLE_SELECTOR, (el) => el.textContent?.trim() ?? '').catch(() => '')) ||
                '';

            if (isStrictRef) {
                // Title rarely contains the ref number; URL slug usually does (or
                // an internal `-asXXXXX` ID). Use title + URL as combined haystack.
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refCore)) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'analogshift',
                title: title.slice(0, 250),
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Analog:Shift (NYC)',
                condition: '',
                year: null,
                location: 'US',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`analogshift: card parse failed`, { err: String(err) });
        }
    }

    log.info(`analogshift: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
