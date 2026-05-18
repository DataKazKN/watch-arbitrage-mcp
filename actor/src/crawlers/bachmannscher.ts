/**
 * Bachmann & Scher (Germany — Munich) crawler — verified v1.
 *
 * Site: https://www.bachmann-scher.de/
 * Brand: Bachmann & Scher — German pre-owned luxury, Munich-based
 * Country: DE
 * Currency: EUR (German format: dots-thousands, comma-decimal — "€ 108.790,-")
 *
 * Live DOM verified 2026-05-18 against:
 *   https://www.bachmann-scher.de/gebrauchte-luxusuhren-kaufen.html
 *   (30 active listings on unfiltered catalog page; small dealer inventory).
 *
 * Card structure (verified):
 *   <div class="watch-list-item">
 *     <div class="watch-item">
 *       <a href="/gebrauchte-luxusuhren-kaufen/{slug}.html">
 *         <div class="watch-image">...</div>
 *         <div class="watch-name">{Brand}</div>
 *         <div class="watch-split-title">
 *           <span class="short-title">{Brand} {Model} Ref {ref} ...</span>
 *           <span class="split-title">...</span>
 *           <span class="split-manufacturer">{Brand}</span>
 *         </div>
 *         <div class="watch-preis">€ 108.790,-</div>
 *       </a>
 *     </div>
 *   </div>
 *
 * Notes:
 * - TYPO3 backend. Brand filter URLs (`?tx_bswatches_watches[watchFilters][...]`)
 *   require a cHash hash that is bound to TYPO3 secret + query — not stable for
 *   external use. Solution: scan the unfiltered catalog and filter client-side
 *   by brand text in `.watch-name`.
 * - Title format: prefixed with brand ("ROLEX Vintage DAYTONA COSMOGRAPH Ref 6263 ...").
 *   Substring filter on ref core works for refs that appear in the title.
 * - Price format: `€ 108.790,-` (EU thousands dot, comma-cents, dash for ",00").
 *   parsePrice handles dots-thousands; the trailing `,-` is dropped.
 * - URL slug is the full descriptive name → useful for `year` extraction
 *   via the `bj-YYYY` (Baujahr = year of manufacture) substring.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Brand, Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD_SELECTOR = '.watch-list-item';
const LINK_SELECTOR = 'a[href*="/gebrauchte-luxusuhren-kaufen/"]';
const TITLE_SELECTOR = '.short-title, .watch-split-title, .watch-name';
const PRICE_SELECTOR = '.watch-preis';

// Brand-name strings that must appear in the listing for us to keep it. Maps
// the ref's detected brand to acceptable substrings in title/name.
const BRAND_KEYWORDS: Record<Brand, RegExp[]> = {
    'patek-philippe': [/patek/i],
    rolex: [/rolex/i],
    'audemars-piguet': [/audemars/i, /royal\s*oak/i],
    unknown: [],
};

export async function bachmannscherHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD_SELECTOR, { timeout: 25_000 });
    } catch {
        log.warning(`bachmannscher: no listings rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD_SELECTOR);
    const out: Listing[] = [];

    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const refCore = refLower.replace(/[^\w]/g, '');
    const targetBrand = detectBrand(ref);
    const brandPatterns = BRAND_KEYWORDS[targetBrand] ?? [];

    for (const card of cards.slice(0, maxListings)) {
        try {
            const priceRaw =
                (await card.$eval(PRICE_SELECTOR, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            if (!priceRaw) continue;
            if (/^(SOLD|RESERVED|POA|ENQUIRE|verkauft)/i.test(priceRaw)) continue;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            const href =
                (await card.$eval(LINK_SELECTOR, (el) => (el as HTMLAnchorElement).href).catch(() => '')) ||
                request.url;

            // Concatenate title-ish texts (short-title + watch-name + split-title) for
            // robust filtering on both brand keyword and ref substring.
            const titleParts = await card.$$eval(TITLE_SELECTOR, (els) =>
                els.map((el) => el.textContent?.trim() ?? '').filter(Boolean),
            );
            const title = titleParts.join(' ').replace(/\s+/g, ' ').slice(0, 250);

            // Brand gate: catalog is mixed, drop non-target-brand cards.
            if (brandPatterns.length > 0) {
                const titleLower = title.toLowerCase();
                if (!brandPatterns.some((re) => re.test(titleLower))) continue;
            }

            if (isStrictRef) {
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refCore)) continue;
            }

            // Year: `bj-YYYY` (Baujahr) is the German "year of manufacture" tag in
            // the slug. Fallback to a plain 4-digit year in title.
            const yearMatch = href.match(/bj-(\d{4})/i) || title.match(/\b(19\d{2}|20\d{2})\b/);
            const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : null;

            out.push({
                ref,
                brand: targetBrand,
                platform: 'bachmannscher',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Bachmann & Scher (Munich)',
                condition: '',
                year,
                location: 'DE',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`bachmannscher: card parse failed`, { err: String(err) });
        }
    }

    log.info(`bachmannscher: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
