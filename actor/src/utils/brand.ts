import type { Brand, Platform } from '../types.js';

/**
 * Heuristic brand detection from reference number OR model name (dealer-friendly).
 *
 * Supports BOTH:
 * - Reference numbers: "5711/1A", "116500LN", "15500ST"
 * - Model names: "Nautilus", "Daytona", "Royal Oak", "Submariner", etc.
 * - Brand only: "Patek", "Rolex", "AP" (will fetch full brand catalog)
 *
 * Falls back to 'unknown' — caller still uses the input as a search query.
 */
export function detectBrand(ref: string): Brand {
    const r = ref.toUpperCase().trim();

    // Brand-only inputs
    if (/^(PATEK|PATEK\s*PHILIPPE|PP)$/.test(r)) return 'patek-philippe';
    if (/^(ROLEX|RLX)$/.test(r)) return 'rolex';
    if (/^(AP|AUDEMARS|AUDEMARS\s*PIGUET)$/.test(r)) return 'audemars-piguet';

    // Patek model names
    if (
        /NAUTILUS|AQUANAUT|CALATRAVA|GRAND\s*COMPLICATIONS|GRANDMASTER|PERPETUAL\s*CALENDAR|WORLD\s*TIME|GOLDEN\s*ELLIPSE|TWENTY[~-]4/.test(
            r,
        )
    )
        return 'patek-philippe';
    // Rolex model names
    if (
        /DAYTONA|SUBMARINER|GMT[-\s]?MASTER|DATEJUST|DAY[-\s]?DATE|EXPLORER|YACHT[-\s]?MASTER|SEA[-\s]?DWELLER|MILGAUSS|AIR[-\s]?KING|SKY[-\s]?DWELLER|OYSTER\s*PERPETUAL|CELLINI|DEEPSEA/.test(
            r,
        )
    )
        return 'rolex';
    // AP model names
    if (/ROYAL\s*OAK|OFFSHORE|CODE\s*11\.59|JULES\s*AUDEMARS|MILLENARY/.test(r)) return 'audemars-piguet';

    // Reference number patterns (existing)
    if (r.includes('/')) return 'patek-philippe';
    // AP: ST/OR/BC/SP suffix on a 5-digit numeric
    if (/^\d{5}(ST|OR|BC|SP|CE)/.test(r)) return 'audemars-piguet';
    // Rolex: 6-digit numeric, optionally with letters after
    if (/^\d{6}([A-Z]{0,6})?$/.test(r)) return 'rolex';
    // Patek fallback: 4-5 digit + letter (5167A, 5712G, 5990A)
    if (/^[56]\d{3,4}[A-Z]/.test(r)) return 'patek-philippe';

    return 'unknown';
}

export function brandLabel(brand: Brand): string {
    switch (brand) {
        case 'patek-philippe':
            return 'Patek Philippe';
        case 'rolex':
            return 'Rolex';
        case 'audemars-piguet':
            return 'Audemars Piguet';
        default:
            return 'Unknown';
    }
}

/**
 * Human-readable platform label used in Telegram messages, README, and any
 * UI-facing surface. Keeps the raw `Platform` enum machine-friendly for
 * grouping/dedup in the dataset while exposing dealer-recognized brand names
 * (e.g. WatchBox kept first as primary recognition + 1916 Company suffix
 * since the 2024 merger of WatchBox + Govberg + Hyde Park into "The 1916
 * Company"). Order preserved: most-recognized name → official entity.
 */
export function platformLabel(platform: Platform): string {
    switch (platform) {
        case 'chrono24':
            return 'Chrono24';
        case 'watchbox':
            return 'WatchBox / The 1916 Company';
        case 'bobs':
            return 'Bobs Watches';
        case 'watchfinder':
            return 'Watchfinder UK';
        case 'europeanwatch':
            return 'European Watch Co';
        case 'watchesofswitzerland':
            return 'Watches of Switzerland';
        case 'hodinkee':
            return 'Hodinkee Shop';
        // ── beta v0.2 sources (added 2026-05-17) ──
        case 'wempe':
            return 'Wempe';
        case 'govberg':
            return 'Govberg';
        case 'crownandcaliber':
            return 'Crown & Caliber';
        case 'tropicalwatch':
            return 'Tropical Watch';
        case 'subdial':
            return 'Subdial';
        case 'mrwatches':
            return 'MR Watches HK';
        case 'yahoojp':
            return 'Yahoo Auctions Japan';
        default: {
            const exhaustive: never = platform;
            return String(exhaustive);
        }
    }
}
