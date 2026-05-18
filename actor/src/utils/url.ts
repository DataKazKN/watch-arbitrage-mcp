import type { Platform } from '../types.js';

/**
 * Per-platform search URL builders.
 *
 * URL patterns verified live 2026-05-04. If a platform changes structure,
 * only this file needs updating — crawlers fetch the URL list from here.
 *
 * Notes per platform:
 * - chrono24: `dosearch=true` is required to actually trigger the search; the
 *   plain `/search/index.htm?query=` returns the empty search FORM. Adding
 *   `currencyId=USD` keeps prices comparable to bobs (also USD).
 * - the1916company: search redirects to a brand-suggest page (0 tiles) when
 *   the query is too short / too generic ("daytona"). Multi-word queries that
 *   include the brand land on `/search/pre-owned/?q=...` and render tiles.
 *   The crawler prepends "patek philippe" / "rolex" / "audemars piguet"
 *   based on the ref's brand prefix.
 * - bobs: site search (`?s=`) gives a non-product results template; the
 *   structured grid only exists at `/{brand}-{model}-{page}.html`. We map
 *   the most common refs to the canonical model URL; otherwise fall back
 *   to the homepage search (likely 0 results).
 * - hodinkee: Shopify search. NOTE: As of 2026-05-04 the shop is winding down
 *   into Watches of Switzerland; live inventory is near-zero. The crawler
 *   skips Sold cards, so this platform will frequently return 0 listings.
 *   Removed from default platforms list 2026-05-04 (kept in enum for backward
 *   compat).
 * - watchfinder: UK leader. Free-text `?q=` returns no-results for ref-style
 *   queries; we map ref → canonical brand+series page (e.g.
 *   `/Rolex/Daytona/watches`, `/Patek+Philippe/Nautilus/watches`).
 * - europeanwatch: Boston US dealer (replacing the dead Crown & Caliber). Search
 *   is unreliable so we hit the brand grid `/brand/{brand-slug}` and filter
 *   inside the crawler by ref-digit substring.
 * - watchesofswitzerland: en-int locale serves globally without UK geo-block.
 *   Patek pricing is hidden ("price on request") on this site so Patek refs
 *   often return 0; Rolex/AP works.
 * - wempe (beta, added 2026-05-17): German luxury retailer, /uk/ locale exposes
 *   pre-owned grid at /uk/luxury-watches/pre-owned with a search at
 *   /uk/search?q={query}. DOM verification pending.
 * - govberg (beta, added 2026-05-17): nominally part of The 1916 Company group
 *   but keeps a separate Govberg-branded surface at govbergwatches.com with its
 *   own search at /search?q={query}. May overlap with watchbox inventory.
 * - crownandcaliber (beta, added 2026-05-17): part of Hodinkee group since 2020,
 *   still serves its own pre-owned grid at /shop/search?q={query}.
 * - tropicalwatch (beta, added 2026-05-17): Miami-based vintage specialist, very
 *   different inventory mix (vintage Rolex / Patek). Search at /search?q={query}.
 * - subdial (beta, added 2026-05-17): UK indie pre-owned, Shopify-style storefront.
 *   Search at /search?q={query}.
 * - mrwatches (beta, added 2026-05-17): Hong Kong dealer, HKD pricing. URL at
 *   /search?q={query}. Currency parsing requires HKD → USD support in fx.ts.
 * - yahoojp (beta, added 2026-05-17): Yahoo Auctions Japan. JPY pricing and
 *   bilingual JP/EN listings. URL builder uses the keyword search route
 *   /jp/search/keyword/{q}. Auction-format vs Buy-It-Now needs special handling.
 */

function encodeRef(ref: string): string {
    // Patek refs include "/" which must be URL-encoded.
    return encodeURIComponent(ref.trim());
}

function brandHint(ref: string): string {
    const r = ref.toLowerCase();
    if (/^57\d\d|^58\d\d|^59\d\d|^41\d\d|^53\d\d|^60\d\d|nautilus|aquanaut|calatrava/.test(r)) {
        return 'patek philippe';
    }
    if (/royal\s*oak|royaloak|^15\d{3}|^26\d{3}|^77\d{3}/.test(r)) {
        return 'audemars piguet';
    }
    // Default to rolex (Daytona/Submariner/GMT/Datejust refs are 5-6 digits).
    return 'rolex';
}

const BOBS_MODEL_PATHS: { test: RegExp; path: string }[] = [
    {
        test: /daytona|11650|11651|11652|11653|11654|11655|11656|11657|11658|11659|126500|126503|126506|126508|126509/i,
        path: '/rolex-daytona-1.html',
    },
    { test: /submariner|11461|11462|11463|11464|116610|126610|126613|126618/i, path: '/rolex-submariner-1.html' },
    { test: /gmt|gmt-master|11671|11672|11673|11675|126710|126711|126715|126720/i, path: '/rolex-gmt-master-1.html' },
    { test: /datejust|11623|11626|11627|11628|11629|126200|126233|126234|126300/i, path: '/rolex-datejust-1.html' },
    { test: /day-?date|11823|11825|11826|11838|118208|118238|228235|228238/i, path: '/rolex-day-date-1.html' },
    { test: /explorer|11427|11427\d|22427\d|14270|114270|214270/i, path: '/rolex-explorer-1.html' },
    { test: /sea-?dweller|seadweller|11660|11666|126600|126603|126660/i, path: '/rolex-sea-dweller-1.html' },
];

/**
 * Watchfinder canonical inventory URLs are `/{Brand}/{Series}/watches`. The
 * site's free-text `?q=` returns "No Results Found" for ref strings, so we
 * map known refs to their series page and let the crawler grab everything
 * on that grid. Patek series segments use `+` for spaces ("Patek+Philippe").
 */
const WATCHFINDER_PATHS: { test: RegExp; path: string }[] = [
    // Patek
    { test: /5711|5712|nautilus/i, path: '/Patek+Philippe/Nautilus/watches' },
    { test: /5167|5164|5168|aquanaut/i, path: '/Patek+Philippe/Aquanaut/watches' },
    { test: /5196|5227|5320|5396|calatrava/i, path: '/Patek+Philippe/Calatrava/watches' },
    // Rolex
    { test: /daytona|11650|11651|11652|126500|126503|126506/i, path: '/Rolex/Daytona/watches' },
    { test: /submariner|11461|11462|11463|11464|116610|126610|126613/i, path: '/Rolex/Submariner/watches' },
    { test: /gmt|gmt-master|11671|11672|11673|11675|126710|126711/i, path: '/Rolex/GMT-Master+II/watches' },
    { test: /datejust|11623|11626|11627|126200|126233|126300/i, path: '/Rolex/Datejust/watches' },
    { test: /day-?date|11823|11826|118208|228235|228238/i, path: '/Rolex/Day-Date/watches' },
    { test: /explorer|11427|14270|114270|214270/i, path: '/Rolex/Explorer/watches' },
    // AP
    { test: /royal\s*oak|royaloak|^15\d{3}|^26\d{3}/i, path: '/Audemars+Piguet/Royal+Oak/watches' },
];

/**
 * European Watch Company brand-grid pages. Search isn't reliable; we hit the
 * full brand inventory and let the crawler filter by ref-digit substring.
 */
function europeanwatchBrandPath(ref: string): string {
    const r = ref.toLowerCase();
    if (/\/|^57|^58|^59|^41|^53|^60|nautilus|aquanaut|calatrava/.test(r)) return '/brand/patek-philippe';
    if (/royal\s*oak|royaloak|^15\d{3}|^26\d{3}|^77\d{3}/.test(r)) return '/brand/audemars-piguet';
    return '/brand/rolex';
}

export function buildSearchUrls(
    platform: Platform,
    references: string[],
): { url: string; userData: { ref: string } }[] {
    return references.map((ref) => ({
        url: buildSingleSearchUrl(platform, ref),
        userData: { ref },
    }));
}

function buildSingleSearchUrl(platform: Platform, ref: string): string {
    const r = encodeRef(ref);
    const hint = brandHint(ref);
    const q = encodeURIComponent(`${hint} ${ref}`);

    switch (platform) {
        case 'chrono24':
            // dosearch=true forces a real search; currencyId=USD avoids FX drift vs bobs.
            return `https://www.chrono24.com/search/index.htm?dosearch=true&query=${q}&currencyId=USD`;

        case 'watchbox':
            // Live-DOM verified 2026-05-06: searching `?q=BRAND+REF` redirects to a
            // brand-suggest splash with NO product tiles. Searching `?q=REF` alone
            // (no brand prefix) lands on `/search/pre-owned/?q=REF` and renders Tile_*
            // cards. Use bare ref. URL also forces en-int region but server still
            // routes EUR by geo — fx.parsePrice handles EUR → USD downstream.
            return `https://www.the1916company.com/search/?q=${r}`;

        case 'bobs': {
            // Live-DOM verified 2026-05-06: `/shop?query=REF` returns h1=REF and
            // structured `div.seocart_ProductWrapper` cards. Replaces stale
            // `/{brand}-{model}-{page}.html` catalog routing which only worked
            // for top 7 collections AND inflated sample size beyond user's ref.
            return `https://www.bobswatches.com/shop?query=${r}`;
        }

        case 'hodinkee':
            // Shopify search. Inventory is near-zero post-merger announcement, but
            // we keep the call so when stock returns we collect it automatically.
            return `https://shop.hodinkee.com/search?type=product&q=${q}`;

        case 'watchfinder': {
            // Map ref → canonical Brand/Series inventory page.
            const match = WATCHFINDER_PATHS.find((m) => m.test.test(ref));
            if (match) return `https://www.watchfinder.co.uk${match.path}`;
            // Fallback to brand search; will frequently render 0 results for
            // unknown series (logged warning by crawler).
            return `https://www.watchfinder.co.uk/wsearch?q=${q}`;
        }

        case 'europeanwatch':
            // Use brand grid (search?q= unreliable); crawler filters by ref digits.
            return `https://www.europeanwatch.com${europeanwatchBrandPath(ref)}`;

        case 'watchesofswitzerland':
            // en-int locale serves globally without UK geo-block; auto-routes to USD.
            return `https://www.watchesofswitzerland.com/en-int/search?q=${q}`;

        // ── beta v0.2 sources (added 2026-05-17) ──
        case 'wempe':
            // /uk/ exposes English UI + £/$ pricing; search route confirmed manually.
            return `https://www.wempe.com/uk/search?q=${q}`;

        case 'govberg':
            // Govberg-branded surface (separate from WatchBox/1916 catalog).
            return `https://www.govbergwatches.com/search?q=${q}`;

        case 'crownandcaliber':
            // Crown & Caliber retains its own /shop/search route despite Hodinkee
            // ownership. Inventory may overlap with Hodinkee Shop on some weeks.
            return `https://www.crownandcaliber.com/search?q=${q}`;

        case 'tropicalwatch':
            // Miami vintage specialist. Shopify storefront.
            return `https://www.tropicalwatch.com/search?q=${q}&type=product`;

        case 'subdial':
            // UK indie pre-owned. Shopify storefront.
            return `https://subdial.com/search?q=${q}&type=product`;

        case 'mrwatches':
            // Hong Kong dealer. HKD pricing — currency conversion handled in fx.ts.
            return `https://www.mrwatches.com.hk/search?q=${q}`;

        case 'yahoojp':
            // Yahoo Auctions JP keyword search. Returns auction-format + Buy-It-Now
            // mixed. Crawler will need to filter on 即決 (buy-now) for stable prices.
            return `https://auctions.yahoo.co.jp/jp/search/keyword/${q}?p=${q}`;

        default: {
            // Exhaustiveness guard — TS prevents unknown `platform` at compile time.
            const exhaustive: never = platform;
            throw new Error(`Unsupported platform: ${String(exhaustive)}`);
        }
    }
}
