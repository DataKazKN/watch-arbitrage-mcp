/**
 * The 1916 Company (ex-WatchBox) crawler.
 *
 * Domain: the1916company.com (legacy watchbox.com redirects).
 * Anti-bot: light. Standard Apify proxy + Camoufox handles.
 *
 * Live-DOM re-verified 2026-05-06 against
 *   https://www.the1916company.com/search/?q=116500LN  (REF ONLY, no brand prefix)
 * → renders Tile_* cards. Previous URL `?q=BRAND+REF` was redirecting to
 *   `/rolex/search/` splash page with 0 tiles (regression vs 2026-05-04 build).
 *   Fix: url.ts now uses bare ref. See url.ts comment.
 *
 * Card structure (verified):
 *   <a class="Tile_container__link" href="/{slug}">
 *     <div class="Tile_tile-wrap">
 *       <div data-testid="plp-watch-tile-brand">Patek Philippe</div>
 *       <div data-testid="plp-watch-tile-name">Nautilus</div>
 *       <div data-testid="plp-watch-tile-ref-no">5811/1G-001</div>
 *       <div data-testid="plp-watch-tile-price">€170.650Current Price: €170.650</div>
 *
 * Notes:
 * - Geo-localised currency. EU IP → EUR (`€170.650`); US IP → USD. Apify
 *   proxy country = US recommended for spread comparability with chrono24/bobs,
 *   but parsePrice handles both formats either way.
 * - Price text is duplicated ("€170.650Current Price: €170.650") — we strip
 *   the "Current Price:" segment to keep parsePrice happy.
 * - Year + condition not on card. All inventory is pre-owned by definition
 *   on this URL prefix.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD_LINK = 'a.Tile_container__link';
const SEL_BRAND = '[data-testid="plp-watch-tile-brand"]';
const SEL_NAME = '[data-testid="plp-watch-tile-name"]';
const SEL_REF = '[data-testid="plp-watch-tile-ref-no"]';
const SEL_PRICE = '[data-testid="plp-watch-tile-price"]';

export async function watchboxHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(`${CARD_LINK}, ${SEL_BRAND}`, { timeout: 25_000 });
    } catch {
        log.warning(`watchbox: no tiles rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD_LINK);
    const out: Listing[] = [];

    // Bug #1 fix: strict-ref filter for precise refs (e.g. "5711/1A").
    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const refCore = refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            const brand = (await card.$eval(SEL_BRAND, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const name = (await card.$eval(SEL_NAME, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const refNo = (await card.$eval(SEL_REF, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const priceRawDup =
                (await card.$eval(SEL_PRICE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            // Strip duplicated "Current Price:" suffix → take the part before it.
            const priceRaw = priceRawDup.split(/Current\s*Price:?/i)[0].trim();
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            const title = [brand, name, refNo].filter(Boolean).join(' ').trim();

            if (isStrictRef) {
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refCore)) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'watchbox',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: '1916 Company (ex-WatchBox)',
                condition: 'pre-owned', // /search/pre-owned/ scope guarantees this
                year: null, // not on tile
                location: parsed.currency === 'EUR' ? 'EU' : 'US',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`watchbox: card parse failed`, { err: String(err) });
        }
    }

    log.info(`watchbox: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
