/**
 * Tropical Watch (Miami) crawler — beta v0.2 stub.
 *
 * Status: URL builder is real, DOM selectors are BEST-EFFORT. Production
 * hardening per platform = separate PR.
 *
 * Verified URL: https://www.tropicalwatch.com/search?q=patek+philippe+5711&type=product
 * Verified DOM: PENDING. Shopify storefront. Strong vintage Rolex/Patek bias.
 *
 * Inventory note: Tropical specializes in vintage and tropical-dial pieces.
 * Modern refs (5711/116500LN) may have low coverage; vintage (1675, 6262)
 * higher. The crawler is not biased — returns whatever the search renders.
 *
 * Country: US (Miami, FL).
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD_SELECTOR = 'a[href*="/products/"], a.product-card, a.grid-product__link';
const SEL_PRICE = '[class*="price"], .money, [data-price]';
const SEL_TITLE = 'h2, h3, [class*="title"]';

export async function tropicalwatchHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_SELECTOR, { timeout: 20_000 });
    } catch {
        log.warning(`tropicalwatch (beta): no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    log.warning(`tropicalwatch (beta): scraper is v0.2 stub — DOM selectors not yet verified.`);

    const cards = await page.$$(CARD_SELECTOR);
    const out: Listing[] = [];

    for (const card of cards.slice(0, maxListings)) {
        try {
            const title = (await card.$eval(SEL_TITLE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const priceRaw = (await card.$eval(SEL_PRICE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            const refLower = ref.toLowerCase().trim();
            const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
            if (isStrictRef) {
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refLower.replace(/[^\w]/g, ''))) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'tropicalwatch',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Tropical Watch',
                condition: '',
                year: null,
                location: 'US',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`tropicalwatch: card parse failed`, { err: String(err) });
        }
    }

    log.info(`tropicalwatch (beta): extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
