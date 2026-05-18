/**
 * Alert dispatcher: Telegram (primary) + email digest (fallback).
 *
 * Rate-limit: max 1 alert per ref per 24h. State stored in KV under
 * `alerthist-{ref}` key. Prevents spam when the same listing stays cheap
 * across multiple scheduled runs.
 *
 * Telegram chosen as primary channel because watch dealers live on Telegram
 * (private group flex). Email is the digest fallback for end-of-day summaries.
 */
import { Actor, log } from 'apify';
import { COUNTRY_LABEL } from './types.js';
import type { ArbitrageOpportunity, CrossCountrySpread } from './types.js';
import { brandLabel, platformLabel } from './utils/brand.js';

const COUNTRY_EMOJI: Record<string, string> = {
    US: '🇺🇸',
    UK: '🇬🇧',
    DE: '🇩🇪',
    CH: '🇨🇭',
    EU: '🇪🇺',
    JP: '🇯🇵',
    HK: '🇭🇰',
};

const ALERT_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface AlertConfig {
    telegramBotToken?: string;
    telegramChatId?: string;
    email?: string;
}

interface AlertHistory {
    last_sent_at: string; // ISO
}

async function shouldSend(ref: string): Promise<boolean> {
    const key = `alerthist-${ref.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const hist = (await Actor.getValue(key)) as AlertHistory | null;
    if (!hist) return true;
    const last = new Date(hist.last_sent_at).getTime();
    return Date.now() - last >= ALERT_DEDUP_WINDOW_MS;
}

async function markSent(ref: string): Promise<void> {
    const key = `alerthist-${ref.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    await Actor.setValue(key, { last_sent_at: new Date().toISOString() } satisfies AlertHistory);
}

function formatTelegramMessage(op: ArbitrageOpportunity): string {
    const brand = brandLabel(op.brand);
    const platform = platformLabel(op.listing.platform);
    return [
        `*Watch arbitrage alert*`,
        `${brand} — \`${op.ref}\``,
        ``,
        `*Asking price*: $${op.listing.price_usd.toLocaleString()} on ${platform}`,
        `*Cross-platform median*: $${op.median_usd.toLocaleString()}`,
        `*Spread*: −$${op.spread_usd.toLocaleString()} (\`${op.spread_pct}%\` below median)`,
        ``,
        op.listing.dealer ? `Dealer: ${op.listing.dealer}` : '',
        op.listing.year ? `Year: ${op.listing.year}` : '',
        `_Asking price excl. shipping, taxes, customs (varies by buyer location)._`,
        ``,
        `[View listing](${op.listing.listing_url})`,
    ]
        .filter(Boolean)
        .join('\n');
}

/**
 * Cross-country spread alert — frames the opportunity as a buy-here / sell-there
 * pair across geographic markets. Example:
 *
 *   "5711/1A — 🇯🇵 JP $148,200 ↔ 🇺🇸 US $192,500 · gap $44,300 (22.7%)"
 *
 * Better mental model for pro dealers who already source globally and want a
 * routing decision (which country to buy from, which to sell into).
 */
function formatCrossCountryMessage(s: CrossCountrySpread): string {
    const brand = brandLabel(s.brand);
    const fromEmoji = COUNTRY_EMOJI[s.from.country] ?? '🌍';
    const toEmoji = COUNTRY_EMOJI[s.to.country] ?? '🌍';
    const fromLabel = COUNTRY_LABEL[s.from.country] ?? s.from.country;
    const toLabel = COUNTRY_LABEL[s.to.country] ?? s.to.country;
    return [
        `*Cross-country spread*`,
        `${brand} — \`${s.ref}\``,
        ``,
        `${fromEmoji} *Buy* in ${fromLabel}: $${s.from.cheapest_price_usd.toLocaleString()}`,
        `   ↳ ${platformLabel(s.from.listing.platform)}${s.from.listing.dealer ? ` · ${s.from.listing.dealer}` : ''}`,
        ``,
        `${toEmoji} *Sell* into ${toLabel} at: $${s.to.cheapest_price_usd.toLocaleString()}`,
        `   ↳ comparison: ${platformLabel(s.to.listing.platform)}`,
        ``,
        `*Gap*: +$${s.gap_usd.toLocaleString()} · \`${s.gap_pct}%\``,
        ``,
        `_Gross figures · excludes shipping, customs, FX execution, dealer margin._`,
        ``,
        `[Buy listing](${s.from.listing.listing_url})`,
        `[Comparison listing](${s.to.listing.listing_url})`,
    ]
        .filter(Boolean)
        .join('\n');
}

async function sendTelegram(token: string, chatId: string, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
        }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Telegram API ${res.status}: ${body.slice(0, 200)}`);
    }
}

// Email digest removed in 0.1.18 — `Actor.call('apify/send-mail')` requires
// FULL_PERMISSIONS scope which sandboxed runtime tokens don't get for public
// actors (returns "Insufficient permissions" silently). Will return in v0.2 via
// direct HTTP API (Resend / MailerSend) once a verified sender domain is wired.

export async function dispatchAlerts(
    opportunities: ArbitrageOpportunity[],
    config: AlertConfig,
): Promise<{ telegram_sent: number; email_sent: boolean; rate_limited: number }> {
    let telegramSent = 0;
    let rateLimited = 0;
    const emailSent = false;

    const fresh: ArbitrageOpportunity[] = [];
    for (const op of opportunities) {
        const ok = await shouldSend(op.ref);
        if (!ok) {
            rateLimited += 1;
            continue;
        }
        fresh.push(op);
    }

    // Telegram per-opportunity (respect ACTOR_MAX_TOTAL_CHARGE_USD spending limit)
    if (config.telegramBotToken && config.telegramChatId) {
        for (const op of fresh) {
            try {
                await sendTelegram(config.telegramBotToken, config.telegramChatId, formatTelegramMessage(op));
                await markSent(op.ref);
                telegramSent += 1;
                const r = await Actor.charge({ eventName: 'spread-alert-triggered' }).catch(() => null);
                if (r?.eventChargeLimitReached) {
                    log.warning('User spending limit reached on spread-alert-triggered. Stopping further alerts.');
                    break;
                }
            } catch (err) {
                log.error(`Telegram send failed for ref=${op.ref}`, { err: String(err) });
            }
        }
    }

    return { telegram_sent: telegramSent, email_sent: emailSent, rate_limited: rateLimited };
}

/**
 * Cross-country alert dispatcher — used when `compare_mode === 'cross_country_pair'`.
 *
 * Same dedup window as `dispatchAlerts()` (24h per ref) so a single ref doesn't
 * spam Telegram with every country pair every run. Caller is expected to pass
 * the top-N spreads per ref (typically just the #1 widest gap).
 */
export async function dispatchCrossCountryAlerts(
    spreads: CrossCountrySpread[],
    config: AlertConfig,
): Promise<{ telegram_sent: number; rate_limited: number }> {
    let telegramSent = 0;
    let rateLimited = 0;

    const fresh: CrossCountrySpread[] = [];
    for (const s of spreads) {
        const ok = await shouldSend(s.ref);
        if (!ok) {
            rateLimited += 1;
            continue;
        }
        fresh.push(s);
    }

    if (config.telegramBotToken && config.telegramChatId) {
        for (const s of fresh) {
            try {
                await sendTelegram(config.telegramBotToken, config.telegramChatId, formatCrossCountryMessage(s));
                await markSent(s.ref);
                telegramSent += 1;
                const r = await Actor.charge({ eventName: 'spread-alert-triggered' }).catch(() => null);
                if (r?.eventChargeLimitReached) {
                    log.warning('User spending limit reached on spread-alert-triggered. Stopping further alerts.');
                    break;
                }
            } catch (err) {
                log.error(`Telegram send failed for cross-country ref=${s.ref}`, { err: String(err) });
            }
        }
    }

    return { telegram_sent: telegramSent, rate_limited: rateLimited };
}
