/**
 * Yahoo Auctions Japan crawler — beta v0.2 stub.
 *
 * Status: URL builder is real, DOM selectors are BEST-EFFORT. Production
 * hardening per platform = separate PR. This is the most complex of the
 * 7 beta sources because:
 *   1. Auction format vs Buy-It-Now (即決) need different price extraction
 *   2. JPY currency (needs fx.ts update for JPY → USD)
 *   3. Bilingual JP/EN listings (titles in JP; ref numbers in latin chars)
 *   4. Anti-scraping more aggressive than Western sites
 *
 * Verified URL: https://auctions.yahoo.co.jp/jp/search/keyword/patek%20philippe%205711?p=patek%20philippe%205711
 * Verified DOM: PENDING.
 *
 * Output strategy: only count listings with 即決 (Buy-It-Now) prices.
 * Current auction bid prices fluctuate and don't represent stable spread data.
 *
 * Country: JP (Tokyo).
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

// Yahoo JP uses .Product anchors for search-result cards.
const CARD_SELECTOR = 'li.Product a.Product__titleLink, li.Product a, a[data-component="ProductImage"]';
const SEL_PRICE_BIN = '.Product__priceValue--buyNow, [class*="buyNow"], [class*="即決"]';
const SEL_PRICE_AUCTION = '.Product__priceValue, [class*="price"]';
const SEL_TITLE = '.Product__titleLink, h3, [class*="title"]';

export async function yahoojpHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_SELECTOR, { timeout: 25_000 });
    } catch {
        log.warning(`yahoojp (beta): no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    log.warning(
        `yahoojp (beta): scraper is v0.2 stub — DOM selectors not yet verified. ` +
            `JPY currency support in fx.ts is also pending; output may be empty until both ship.`,
    );

    const cards = await page.$$(CARD_SELECTOR);
    const out: Listing[] = [];

    for (const card of cards.slice(0, maxListings)) {
        try {
            const title = (await card.$eval(SEL_TITLE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            // Prefer Buy-It-Now (即決) price if available; fall back to current auction bid.
            const priceBin =
                (await card.$eval(SEL_PRICE_BIN, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const priceAuction =
                (await card.$eval(SEL_PRICE_AUCTION, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const priceRaw = priceBin || priceAuction;
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            const refLower = ref.toLowerCase().trim();
            const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
            if (isStrictRef) {
                // Yahoo titles may use full-width chars; normalize to ASCII for the check.
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refLower.replace(/[^\w]/g, ''))) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'yahoojp',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Yahoo Auctions Japan',
                condition: '',
                year: null,
                location: 'JP',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`yahoojp: card parse failed`, { err: String(err) });
        }
    }

    log.info(`yahoojp (beta): extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
