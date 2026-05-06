/**
 * European Watch Company crawler.
 *
 * Boston-based US dealer. Strong Patek/Rolex/AP inventory (verified 69 Patek
 * pieces in stock 2026-05-04). Originally planned to use Crown & Caliber but
 * that brand was acquired by Hodinkee in 2021 and its commerce site is now
 * editorial-only. European Watch Company gives equivalent US-side coverage
 * with an active inventory grid.
 *
 * Anti-bot: light. Standard Apify proxy + Camoufox handles.
 *
 * Live-DOM verified 2026-05-04 against
 *   https://www.europeanwatch.com/brand/patek-philippe → 74 unique cards
 *   https://www.europeanwatch.com/brand/rolex          → similar grid
 *
 * Card structure (verified 2026-05-04 against /brand/rolex):
 *   <a class="flex gap-4 items-center hover:bg-blue-600/5 ..." href="/watch/{slug}">
 *     <div class="relative size-18"><img ...></div>
 *     <div>
 *       <h3 class="text-base font-ivy-presto text-blue-600">
 *         Panerai PAM00931 Radiomir California 47MM SS Brown California Dial
 *       </h3>
 *       <p class="text-sm font-decimal ...">$6,950</p>
 *     </div>
 *   </a>
 *
 * Notes:
 * - h3 = full title (brand + ref + model + dial); p = just the price.
 * - All pricing in USD on this US site.
 * - URL pattern uses `/brand/{brand-slug}` for grid pages; ref-search isn't
 *   reliable on this site (search?q= renders the same recent-arrivals fallback)
 *   so the url builder maps brand intent from the ref instead.
 * - The brand-grid renders cards from ALL brands (not just the requested
 *   brand) at the top as suggestions, so we filter cards by ref-digit
 *   substring on the title to keep relevant rows.
 * - Year is in the title slug occasionally ("Daytona 2024 ..."); we extract
 *   it best-effort.
 */
import type { PlaywrightCrawlingContext } from '@crawlee/playwright';
import { log } from 'apify';

import type { Listing } from '../types.js';
import { detectBrand } from '../utils/brand.js';
import { parsePrice, toUsd } from '../utils/fx.js';

const CARD = 'a[href*="/watch/"]';

function extractYear(text: string): number | null {
    const m = text.match(/\b(19|20)\d{2}\b/);
    if (!m) return null;
    const y = parseInt(m[0], 10);
    return y >= 1900 && y <= new Date().getFullYear() ? y : null;
}

export async function europeanwatchHandler(ctx: PlaywrightCrawlingContext, maxListings: number): Promise<Listing[]> {
    const { page, request } = ctx;
    const ref = (request.userData?.ref as string) ?? '';

    try {
        await page.waitForSelector(CARD, { timeout: 25_000 });
    } catch {
        log.warning(`europeanwatch: no cards rendered for ref="${ref}"`, { url: request.url });
        return [];
    }

    // Dedupe by href — the page renders inventory rows + recommended-strip duplicates.
    const cards = await page.$$(CARD);
    log.info(`europeanwatch: ${cards.length} raw cards pre-dedupe for ref="${ref}"`);
    const seen = new Set<string>();
    const uniq: typeof cards = [];
    for (const card of cards) {
        const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || '';
        if (!href || seen.has(href)) continue;
        seen.add(href);
        uniq.push(card);
    }

    const out: Listing[] = [];

    // Bug #1 fix + 2026-05-06 regression patch: brand-grid platforms (europeanwatch,
    // watchfinder, WoS) display BASE refs ("5711/1A") in titles, not sub-variants
    // ("5711/1A-010"). The previous full-ref-core match (`57111a010` substring)
    // stripped 100% of legitimate cards (302 raw → 0 extracted on 2026-05-05 run).
    // Fix: match the BASE prefix (first 4-6 digits + immediate letters). Aggregator's
    // extractSubRef() then groups detected sub-variants separately for accurate
    // median + spread detection — see aggregator.ts.
    const refLower = ref.toLowerCase().trim();
    const isStrictRef = refLower.includes('/') || /\d{4,}/.test(refLower);
    const baseMatch = refLower.replace(/[^\w]/g, '').match(/^(\d{4,6}[a-z]{0,3})/);
    const basePrefix = baseMatch ? baseMatch[1] : refLower.replace(/[^\w]/g, '');

    for (const card of uniq.slice(0, maxListings * 4)) {
        try {
            // The h3/p sit in a SIBLING div alongside the link (overlay layout),
            // not inside the link. Walk up to a common parent that contains both.
            // Try inside-link first (mobile/tablet layouts), then walk up to grandparent.
            const href = (await card.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => '')) || request.url;
            const extracted = await card
                .evaluate((linkEl) => {
                    function findClosestWithTitle(el: Element | null): Element | null {
                        let cur: Element | null = el;
                        for (let i = 0; cur && i < 6; i++) {
                            if (cur.querySelector('h3') && cur.querySelector('p')) return cur;
                            cur = cur.parentElement;
                        }
                        return null;
                    }
                    const wrap = findClosestWithTitle(linkEl);
                    if (!wrap) return { title: '', price: '' };
                    const h3 = wrap.querySelector('h3');
                    // First <p> inside the wrap that looks like a price.
                    const ps = Array.from(wrap.querySelectorAll('p'));
                    const priceP = ps.find((p) => /\$|USD|£|€/.test((p.textContent ?? '').trim())) ?? ps[0];
                    return {
                        title: (h3?.textContent ?? '').trim(),
                        price: (priceP?.textContent ?? '').trim(),
                    };
                })
                .catch(() => ({ title: '', price: '' }));

            const title = extracted.title;
            const priceRaw = extracted.price;

            const parsed = parsePrice(priceRaw);
            if (!parsed) continue;

            // Match BASE prefix (e.g. "57111a" for "5711/1A-010"). Aggregator
            // groups by extractSubRef() afterward so sub-variants get correct medians.
            if (isStrictRef) {
                const haystack = `${title} ${href}`.toLowerCase().replace(/[^\w]/g, '');
                if (!haystack.includes(basePrefix)) continue;
            }

            if (out.length >= maxListings) break;

            out.push({
                ref,
                brand: detectBrand(ref),
                platform: 'europeanwatch',
                title,
                price_usd: toUsd(parsed.amount, parsed.currency),
                price_orig: parsed.amount,
                currency: parsed.currency,
                listing_url: href,
                dealer: 'European Watch Company',
                condition: 'pre-owned',
                year: extractYear(title),
                location: 'US',
                scraped_at: new Date().toISOString(),
            });
        } catch (err) {
            log.debug(`europeanwatch: card parse failed`, { err: String(err) });
        }
    }

    log.info(`europeanwatch: extracted ${out.length} listings for ref="${ref}"`);
    return out;
}
