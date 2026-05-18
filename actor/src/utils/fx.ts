/**
 * Static FX rates → USD baseline.
 *
 * Rationale: live FX (ECB API) adds an HTTP dep per run for ~1% accuracy gain
 * vs static. Watch arbitrage spreads are typically 5-30% — sub-1% FX precision
 * doesn't change the buy/no-buy call. Refresh quarterly via PR.
 *
 * Snapshot date: 2026-05-04 (approx mid-market).
 */
const RATES_TO_USD: Record<string, number> = {
    USD: 1.0,
    EUR: 1.08,
    GBP: 1.27,
    CHF: 1.12,
    JPY: 0.0066,
    HKD: 0.128,
    SGD: 0.74,
    AUD: 0.66,
    CAD: 0.73,
};

/**
 * EU listings shipped to a US buyer typically incur ~20% extra
 * (5-10% import duty + 5-10% courier/customs fee). Simplified flat estimate;
 * dealers should treat as ±5% accurate. Clearly labeled "estimate" in alerts.
 */
const EU_TO_US_IMPORT_OVERHEAD = 0.2;

const EU_LOCATIONS = new Set([
    'DE',
    'FR',
    'IT',
    'ES',
    'NL',
    'BE',
    'AT',
    'IE',
    'SE',
    'DK',
    'FI',
    'PL',
    'PT',
    'CZ',
    'EU',
]);

export function toUsd(amount: number, currency: string): number {
    const rate = RATES_TO_USD[currency.toUpperCase()];
    if (!rate) {
        // Unknown currency → assume already USD (worst-case under-estimate)
        return amount;
    }
    return Math.round(amount * rate * 100) / 100;
}

export function applyImportOverhead(usdPrice: number, locationCode: string): number {
    if (EU_LOCATIONS.has(locationCode.toUpperCase())) {
        return Math.round(usdPrice * (1 + EU_TO_US_IMPORT_OVERHEAD) * 100) / 100;
    }
    return usdPrice;
}

/**
 * Parse "$12,500", "USD 12,500", "€11.250,00", "12.500 €" → { amount, currency }.
 * Best-effort; returns null on unparseable input.
 */
export function parsePrice(raw: string): { amount: number; currency: string } | null {
    if (!raw) return null;

    const cleaned = raw.replace(/\s+/g, ' ').trim();

    // Detect currency. Order matters: HK$ before bare $ (substring), full-width
    // 円 / ￥ for Japanese sites before generic ¥, and HKD prefix variants.
    let currency = 'USD';
    if (/€|EUR/i.test(cleaned)) currency = 'EUR';
    else if (/£|GBP/i.test(cleaned)) currency = 'GBP';
    else if (/CHF|FR\./i.test(cleaned)) currency = 'CHF';
    else if (/HK\$|HKD|港幣/i.test(cleaned)) currency = 'HKD';
    else if (/[¥￥]|JPY|円/i.test(cleaned)) currency = 'JPY';
    else if (/\$|USD/i.test(cleaned)) currency = 'USD';

    // Japanese 万 (man = 10,000-unit) multiplier. "2,250万円" = 2,250 × 10,000 = 22,500,000.
    const hasManMultiplier = currency === 'JPY' && /万/.test(cleaned);

    // Extract numeric portion. Strategy: keep digits + separators, then normalize.
    const numericMatch = cleaned.match(/[\d.,]+/);
    if (!numericMatch) return null;

    let n = numericMatch[0];

    // Heuristic: if both . and , present, the last one is the decimal sep.
    // If only one, treat , as thousands sep when followed by 3 digits, else decimal.
    if (n.includes('.') && n.includes(',')) {
        const lastDot = n.lastIndexOf('.');
        const lastComma = n.lastIndexOf(',');
        if (lastComma > lastDot) {
            // EU style: 11.250,00 → 11250.00
            n = n.replace(/\./g, '').replace(',', '.');
        } else {
            // US style: 11,250.00 → 11250.00
            n = n.replace(/,/g, '');
        }
    } else if (n.includes(',')) {
        const parts = n.split(',');
        if (parts[parts.length - 1].length === 3) {
            n = n.replace(/,/g, '');
        } else {
            n = n.replace(',', '.');
        }
    } else if (n.includes('.')) {
        const parts = n.split('.');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
            n = n.replace(/\./g, '');
        }
    }

    let amount = parseFloat(n);
    if (Number.isNaN(amount) || amount <= 0) return null;

    // Apply 万 multiplier last so digit-parsing happens on the bare number.
    if (hasManMultiplier) amount *= 10_000;

    return { amount, currency };
}
