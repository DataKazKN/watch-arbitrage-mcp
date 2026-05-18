/**
 * Wempe (Hamburg) crawler — beta v0.2 stub.
 *
 * Status: URL builder is real, DOM selectors are BEST-EFFORT. Production
 * hardening per platform = separate PR (one PR per beta source).
 *
 * Verified URL: https://www.wempe.com/uk/search?q=patek+philippe+5711
 * Verified DOM: PENDING — placeholder selectors below match the common
 * Shopify-style listing-card pattern (price + title + link). Update once
 * a live render is captured and verified.
 *
 * Currency: site serves both £ and $ depending on geo. parsePrice + toUsd
 * already handle GBP and USD. EUR fallback is also covered.
 *
 * Country: DE (head office Hamburg), even though /uk/ locale serves £.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

// Best-effort selectors (Shopify-ish pattern). Verify against live DOM before promoting to v1.
const CARD_SELECTOR = 'a[href*="/uk/"][href*="watches"], a[href*="/product/"]';
const SEL_PRICE = '[class*="price"], [data-price], .money';
const SEL_TITLE = 'h2, h3, [class*="title"]';

export async function wempeHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_SELECTOR, { timeout: 20_000 });
    } catch {
        log.warning(`wempe (beta): no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    log.warning(
        `wempe (beta): scraper is v0.2 stub — DOM selectors not yet verified against live render. ` +
            `Output may be incomplete. Track hardening progress in PR backlog.`,
    );

    const cards = await page.$$(CARD_SELECTOR);
    const out: Listing[] = [];

    for (const card of cards.slice(0, maxListings)) {
        try {
            const title = (await card.$eval(SEL_TITLE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const priceRaw = (await card.$eval(SEL_PRICE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            // Ref-substring filter (refs containing digits or slashes are strict).
            const refLower = ref.toLowerCase().trim();
            const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
            if (isStrictRef) {
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refLower.replace(/[^\w]/g, ''))) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'wempe',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Wempe',
                condition: '',
                year: null,
                location: 'DE',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`wempe: card parse failed`, { err: String(err) });
        }
    }

    log.info(`wempe (beta): extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
