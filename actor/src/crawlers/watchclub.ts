/**
 * The Watch Club (London) crawler — verified v1.
 *
 * Site: https://www.watchclub.com/
 * Geography: UK HQ (London) + Hong Kong office. Country tag = UK (HQ).
 * Currency: GBP (auto-routes by geo; en-int locale not supported).
 *
 * Live DOM verified 2026-05-17 against:
 *   https://www.watchclub.com/patek-philippe (4 results, currency GBP)
 *   https://www.watchclub.com/rolex
 *   https://www.watchclub.com/audemars-piguet
 *
 * Card structure (verified):
 *   <a href="/patek-philippe/{model}/{ref-slug}-ref-{REF}-year-{YYYY}">
 *     <h3 class="mainTitle">Patek Philippe</h3>
 *     <span class="productPrice">£ 29,500</span>
 *     ...
 *   </a>
 *
 * Price values may be: numeric ("£ 29,500"), "SOLD", "RESERVED (POA)", "POA".
 * Crawler skips non-numeric entries.
 *
 * History: replaced the `mrwatches` slot (mrwatches.com.hk was a dead domain
 * placeholder) on 2026-05-17. The Watch Club is a real verified dealer with
 * HK office, even if HQ remains London.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD_SELECTOR =
    'a[href*="-ref-"][href*="watchclub.com"], a[href*="/patek-philippe/"][href*="-ref-"], a[href*="/rolex/"][href*="-ref-"], a[href*="/audemars-piguet/"][href*="-ref-"]';
const SEL_PRICE = '.productPrice';
const SEL_TITLE = 'h3, h4, .mainTitle';

export async function watchclubHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_SELECTOR, { timeout: 25_000 });
    } catch {
        log.warning(`watchclub: no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD_SELECTOR);
    const out: Listing[] = [];

    // Strict-ref filter for digit-heavy refs.
    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const refCore = refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            const priceRaw = (await card.$eval(SEL_PRICE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';

            // Skip unavailable listings (SOLD / RESERVED / POA = no price comparable).
            if (/^(SOLD|RESERVED|POA|ENQUIRE)/i.test(priceRaw)) continue;

            const titleText = (await card.evaluate((el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const titleClean = titleText.replace(/\s+/g, ' ').slice(0, 200);
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            if (isStrictRef) {
                const haystack = `${titleClean} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refCore)) continue;
            }

            // Year often in URL slug (...-year-2022). Extract for richer dataset.
            const yearMatch = href.match(/-year-(\d{4})/);
            const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : null;

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'watchclub',
                title: titleClean,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'The Watch Club London',
                condition: '', // not on grid card; would need detail-page fetch
                year,
                location: 'GB',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`watchclub: card parse failed`, { err: String(err) });
        }
    }

    log.info(`watchclub: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
