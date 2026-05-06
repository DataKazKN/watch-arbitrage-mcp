/**
 * Bobs Watches crawler.
 *
 * US dealer (Newport Beach, CA). Cloudflare moderate — Camoufox + proxy
 * rotation handles. Site uses a custom storefront ("seocart") rather than
 * WooCommerce.
 *
 * Live-DOM re-verified 2026-05-06 against
 *   https://www.bobswatches.com/shop?query=124060
 * → renders `div.seocart_ProductWrapper` cards (h1="124060" confirms ref filter).
 *   Previous URL used `/{brand}-{model}-{page}.html` catalog routing which only
 *   covered top 7 collections AND inflated sample size beyond the user's exact
 *   ref. The `?s=...` site-search fallback returned 0 structured cards (matched
 *   homepage template). Switched to `/shop?query=REF` which is the actual search
 *   endpoint exposed by the homepage form (action="/shop", method="get",
 *   input name="query"). See url.ts.
 * - Cloudflare interstitial ("Un instant...") may delay first paint up to ~8s.
 *   waitForSelector timeout extended to 45s to accommodate.
 *
 * Card structure (verified):
 *   <div class="seocart_ProductWrapper">
 *     <div class="seocart_ProductInner">
 *       <a href="/{slug}.html"> ... <span class="seocart_ProductName">Rolex Daytona</span> ... </a>
 *       <div class="seocart_ProductPriceActions">
 *         <ul class="itemprice">
 *           <li class="buyprice buyit"><span class="buyPriceText priceText">$44,995</span></li>
 *           <li class="sellprice"><span class="sellPriceText priceText getQuoteText">Get Quote</span></li>
 *     <script type="application/ld+json"> { schema.org Product with mpn, color, image, ... }
 *
 * Notes:
 * - Year is embedded in the description text in parens, e.g. "Box (2005)".
 *   We pull it from the JSON-LD `additionalProperty` if present, else regex
 *   the visible card text for `(YYYY)`.
 * - Reference number = JSON-LD `mpn`. Bobs is Rolex-only (and a few Omega).
 * - URL pattern needs caller to pass the right seed URL (e.g.
 *   `/rolex-daytona-1.html`, `/rolex-submariner-1.html`). The generic
 *   `/used-rolex-watches/<model>` path is 404.
 * - "Get Quote" sellprice rows mean Bobs will buy the watch — IGNORE; we want
 *   the buyprice (what a customer pays).
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD = '.seocart_ProductWrapper';
const SEL_NAME = '.seocart_ProductName';
const SEL_PRICE = '.buyPriceText';
const SEL_LD = 'script[type="application/ld+json"]';

interface JsonLdProduct {
    name?: string;
    mpn?: string;
    color?: string;
    url?: string;
    itemCondition?: string;
    additionalProperty?: { name?: string; value?: string | number }[];
}

function extractYear(jsonLd: JsonLdProduct | null, cardText: string): number | null {
    // 1. Try JSON-LD additionalProperty (most reliable when present).
    const yearProp = jsonLd?.additionalProperty?.find(
        (p) => typeof p.name === 'string' && /year|production/i.test(p.name),
    );
    if (yearProp?.value != null) {
        const y = parseInt(String(yearProp.value), 10);
        if (y >= 1900 && y <= 2100) return y;
    }
    // 2. Fallback: parse "(YYYY)" out of visible card text.
    const m = cardText.match(/\((19|20)\d{2}\)/);
    if (m) return parseInt(m[0].slice(1, -1), 10);
    return null;
}

export async function bobsHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        // 45s to accommodate Cloudflare "Un instant..." interstitial (~8s typical)
        // plus initial Camoufox boot. Lower timeouts caused systematic 0-result runs.
        await page.waitForSelector(CARD, { timeout: 45_000 });
    } catch {
        log.warning(`bobs: no products rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    const cards = await page.$$(CARD);
    const out: Listing[] = [];

    // Bug #1 fix: strict-ref filter for precise refs (e.g. "116500LN").
    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const refCore = refLower.replace(/[^\w]/g, '');

    for (const card of cards.slice(0, maxListings)) {
        try {
            const name = (await card.$eval(SEL_NAME, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            const priceRaw = (await card.$eval(SEL_PRICE, (el) => el.textContent?.trim() ?? '').catch(() => '')) || '';
            // Prefer the explicit "Buy" CTA link over generic anchors (which may point
            // to category nav). `.buttonBuy` is the dedicated product link on
            // /shop?query= layouts.
            const href =
                (await card.$eval('a.buttonBuy', (el) => (el as HTMLAnchorElement).href).catch(() => '')) ||
                (await card.$eval('a[href]', (el) => (el as HTMLAnchorElement).href).catch(() => '')) ||
                request.url;
            // Fallback: derive a readable title from the URL slug when SEL_NAME
            // is missing (which happens on /shop?query= layouts that strip the
            // marketing name in favor of compact tile rendering).
            const slugTitle = (() => {
                try {
                    const path = new URL(href).pathname;
                    return decodeURIComponent(path.split('/').pop() ?? '')
                        .replace(/\.html$/, '')
                        .replace(/[-_]+/g, ' ')
                        .trim();
                } catch {
                    return '';
                }
            })();

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            // Pull JSON-LD if present (gives mpn + condition + year via additionalProperty).
            let ld: JsonLdProduct | null = null;
            try {
                const ldRaw = await card.$eval(SEL_LD, (el) => el.textContent ?? '').catch(() => '');
                if (ldRaw) ld = JSON.parse(ldRaw) as JsonLdProduct;
            } catch {
                ld = null;
            }

            const cardText = (await card.evaluate((el) => el.textContent ?? '').catch(() => '')) || '';
            const visibleText = cardText
                .replace(/\{[^}]*\}/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            // Use `||` (not `??`) so empty strings fall through to the next fallback.
            const fullTitle = ld?.name || `${name}${ld?.mpn ? ` ${ld.mpn}` : ''}`.trim() || slugTitle || name || ref;
            const condition = ld?.itemCondition?.replace(/.*\//, '') || 'pre-owned';
            const year = extractYear(ld, visibleText);

            if (isStrictRef) {
                const haystack = `${fullTitle} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(refCore)) continue;
            }

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'bobs',
                title: fullTitle,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'Bobs Watches',
                condition,
                year,
                location: 'US',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`bobs: card parse failed`, { err: String(err) });
        }
    }

    log.info(`bobs: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
