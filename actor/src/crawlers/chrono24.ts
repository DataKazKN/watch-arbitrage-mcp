/**
 * Chrono24 crawler.
 *
 * Anti-bot: Cloudflare moderate. Strategy = Camoufox (Firefox-based stealth)
 * + Apify proxy rotation.
 *
 * Live-DOM verified 2026-05-04 against
 *   https://www.chrono24.com/search/index.htm?dosearch=true&query=patek+philippe+5711&currencyId=USD
 * → 60 listings rendered.
 *
 * Card structure (verified):
 *   <a class="wt-listing-item-link js-listing-item-link listing-item-link" href="/{brand}/{slug}--id{N}.htm">
 *     <p class="text-bold text-sm text-sm-md text-ellipsis m-b-0">  → Brand+Model line  </p>
 *     <p class="text-ellipsis m-b-0 text-sm text-sm-md">             → Reference number    </p>
 *     <p class="text-bold text-md m-b-0">                            → Price (currency dep. on currencyId)
 *     <span class="text-sm text-uppercase">                          → Country code (e.g. "US", "DE")
 *   </a>
 *
 * Container wrap: `.js-listing-item.listing-item` (60 found).
 *
 * Notes:
 * - Year + condition are NOT on the search-results card; only on the detail page.
 *   We pass year=null and condition='' rather than risk false positives from
 *   regex on title text (a "5711" match would otherwise capture as year 5711).
 * - URL includes `currencyId=USD` so prices come back as "$174,000" → no FX.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD_LINK = 'a.js-listing-item-link';
const SEL_TITLE = 'p.text-bold.text-sm.text-sm-md.text-ellipsis';
const SEL_REF = 'p.text-ellipsis.m-b-0.text-sm.text-sm-md';
const SEL_PRICE = 'p.text-bold.text-md';
const SEL_COUNTRY = 'span.text-sm.text-uppercase';

export async function chrono24Handler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_LINK, { timeout: 25_000 });
    } catch {
        log.warning(`chrono24: no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD_LINK);
    const out: Listing[] = [];

    // Bug #1 fix: strict-ref filter. For precise refs (slash, digit-heavy), drop
    // listings whose title+URL don't contain the ref core. Model-name searches
    // (Nautilus/Daytona/Royal Oak) skip this filter — broadness is intentional.
    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const refCore = refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            const titleLine = (await card.$eval(SEL_TITLE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            // Subtitle is the SECOND p.text-ellipsis (the first one is the bold title).
            const refLine =
                (await card
                    .$$eval(SEL_REF, (els) => (els[1]?.textContent ?? els[0]?.textContent ?? '').trim())
                    .catch(() => '')) || '';
            const priceRaw = (await card.$eval(SEL_PRICE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const country = (await card.$eval(SEL_COUNTRY, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            const title = [titleLine, refLine].filter(Boolean).join(' ').trim();

            if (isStrictRef) {
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refCore)) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'chrono24',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: '', // dealer name only on detail page; left blank intentionally
                condition: '', // not on listing card
                year: null, // year not on listing card; do not regex from title (refs collide)
                location: country,
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`chrono24: card parse failed`, { err: String(err) });
        }
    }

    log.info(`chrono24: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
