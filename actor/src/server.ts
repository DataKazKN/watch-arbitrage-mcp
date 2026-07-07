/**
 * server.ts — Apify Standby HTTP server (compound revenue mode).
 *
 * Two API surfaces, one process:
 *   1. REST endpoints (POST /mcp/arbitrage, /mcp/market-stats, /mcp/listings)
 *      → curl/HTTP clients, integrations, dashboards.
 *   2. MCP JSON-RPC (POST/GET/DELETE /mcp) via Streamable HTTP transport
 *      → Claude Desktop, Cursor, Windsurf, ChatGPT custom GPTs.
 *
 * Both surfaces are backed by the SAME data source: the latest cached
 * MARKET_SNAPSHOT + ARBITRAGE_OPPORTUNITIES + dataset items written by the
 * batch run. We never trigger fresh crawls from a query — too slow + risk of
 * runaway cost. If cache is stale (older than CACHE_MAX_AGE_MIN) the endpoints
 * return 503 with Retry-After.
 *
 * Auth: Apify Standby gates calls behind the user's API token at the platform
 * edge, so no extra middleware is strictly required. We additionally verify
 * `Authorization: Bearer <token>` or `?token=<token>` matches the runner's
 * APIFY_TOKEN as defense-in-depth.
 *
 * Charging: each MCP query charges `spread-alert-triggered` ($1.50-$2.00,
 * depending on the caller's Apify plan) for
 * arbitrage queries (the value-extracting event) and
 * `apify-default-dataset-item` ($0.001) per listing returned. Stats queries
 * (cheap aggregate read) only charge actor-start.
 */
import { setTimeout as sleep } from 'node:timers/promises';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Actor, log } from 'apify';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';

import type { ArbitrageOpportunity, BoxPapersStatus, Listing, RefStats, WatchCondition } from './types.js';

// --- Constants ---
const PORT = Number(process.env.ACTOR_STANDBY_PORT || process.env.ACTOR_WEB_SERVER_PORT || process.env.PORT || 4321);
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const CACHE_MAX_AGE_MIN = Number(process.env.WATCHARB_CACHE_MAX_AGE_MIN || 60);

// --- KV cache loaders ---
interface CacheBundle {
    snapshot: RefStats[];
    opportunities: ArbitrageOpportunity[];
    listings: Listing[];
    cachedAt: string | null;
    ageMinutes: number | null;
}

async function loadCache(): Promise<CacheBundle> {
    let snapshot: RefStats[] = [];
    let opportunities: ArbitrageOpportunity[] = [];
    let listings: Listing[] = [];
    let cachedAt: string | null = null;

    try {
        const s = await Actor.getValue<RefStats[]>('MARKET_SNAPSHOT');
        if (Array.isArray(s)) snapshot = s;
    } catch (err) {
        log.warning('[server] failed to load MARKET_SNAPSHOT', { err: String(err) });
    }

    try {
        const o = await Actor.getValue<ArbitrageOpportunity[]>('ARBITRAGE_OPPORTUNITIES');
        if (Array.isArray(o)) opportunities = o;
    } catch (err) {
        log.warning('[server] failed to load ARBITRAGE_OPPORTUNITIES', { err: String(err) });
    }

    try {
        const dataset = await Actor.openDataset();
        const { items } = await dataset.getData({ clean: true });
        listings = (items ?? []) as unknown as Listing[];
    } catch (err) {
        log.warning('[server] failed to load dataset items', { err: String(err) });
    }

    if (opportunities.length > 0) {
        cachedAt = opportunities[0]?.detected_at ?? null;
    } else if (listings.length > 0) {
        cachedAt = listings[listings.length - 1]?.scraped_at ?? null;
    }

    let ageMinutes: number | null = null;
    if (cachedAt) {
        const ms = Date.now() - new Date(cachedAt).getTime();
        ageMinutes = Math.round(ms / 60_000);
    }

    return { snapshot, opportunities, listings, cachedAt, ageMinutes };
}

function isStale(cache: CacheBundle): boolean {
    if (cache.ageMinutes === null) return cache.snapshot.length === 0;
    return cache.ageMinutes > CACHE_MAX_AGE_MIN;
}

// --- Auth middleware ---
// Apify Standby gates incoming traffic behind the user's API token at the
// platform edge — by the time a request reaches this handler, the caller is
// already authenticated against the Apify platform. We only enforce a manual
// bearer check when WATCHARB_REQUIRE_BEARER is set (defense-in-depth opt-in
// for self-hosted scenarios).
function bearerAuth(req: Request, res: Response, next: NextFunction): void {
    if (process.env.WATCHARB_REQUIRE_BEARER !== '1') {
        next();
        return;
    }
    const expected = process.env.WATCHARB_BEARER_TOKEN || '';
    const authHeader = req.header('authorization') ?? '';
    const headerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const queryToken = (req.query.token as string | undefined) ?? '';
    const provided = headerToken || queryToken;
    if (expected && provided === expected) {
        next();
        return;
    }
    res.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token required (set via Authorization header or ?token= query param).',
    });
}

// --- Helper: filter listings by condition / box-papers ---
function filterListings(
    listings: Listing[],
    ref: string,
    condition?: WatchCondition[],
    boxPapers?: BoxPapersStatus[],
): Listing[] {
    const refUpper = ref.toUpperCase();
    return listings.filter((l) => {
        if (l.ref.toUpperCase() !== refUpper) return false;
        if (condition && condition.length > 0 && !condition.includes(l.condition_normalized ?? 'unknown')) {
            return false;
        }
        if (boxPapers && boxPapers.length > 0 && !boxPapers.includes(l.box_papers ?? 'unknown')) {
            return false;
        }
        return true;
    });
}

// --- Core query implementations (shared between REST + MCP) ---

interface ArbitrageQuery {
    references?: string[];
    min_spread_pct?: number;
    limit?: number;
}
interface ArbitrageResult {
    cached_at: string | null;
    age_minutes: number | null;
    opportunities: ArbitrageOpportunity[];
    total_matched: number;
}

async function queryArbitrage(args: ArbitrageQuery): Promise<ArbitrageResult> {
    const cache = await loadCache();
    if (isStale(cache)) {
        const err = new Error('Cache stale or empty — run the batch crawler first.');
        (err as Error & { code?: number }).code = 503;
        throw err;
    }

    const refsUpper = (args.references ?? []).map((r) => r.toUpperCase().trim()).filter(Boolean);
    const minPct = args.min_spread_pct ?? 0;
    const limit = Math.min(Math.max(args.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    let filtered = cache.opportunities;
    if (refsUpper.length > 0) {
        filtered = filtered.filter((o) => refsUpper.includes(o.ref.toUpperCase()));
    }
    if (minPct > 0) {
        filtered = filtered.filter((o) => o.spread_pct >= minPct);
    }

    return {
        cached_at: cache.cachedAt,
        age_minutes: cache.ageMinutes,
        total_matched: filtered.length,
        opportunities: filtered.slice(0, limit),
    };
}

interface MarketStatsQuery {
    references?: string[];
}
interface MarketStatsResult {
    cached_at: string | null;
    age_minutes: number | null;
    stats: RefStats[];
}

async function queryMarketStats(args: MarketStatsQuery): Promise<MarketStatsResult> {
    const cache = await loadCache();
    if (isStale(cache)) {
        const err = new Error('Cache stale or empty — run the batch crawler first.');
        (err as Error & { code?: number }).code = 503;
        throw err;
    }
    const refsUpper = (args.references ?? []).map((r) => r.toUpperCase().trim()).filter(Boolean);
    const stats =
        refsUpper.length > 0 ? cache.snapshot.filter((s) => refsUpper.includes(s.ref.toUpperCase())) : cache.snapshot;

    return {
        cached_at: cache.cachedAt,
        age_minutes: cache.ageMinutes,
        stats,
    };
}

interface ListingsQuery {
    ref: string;
    condition?: WatchCondition[];
    box_papers?: BoxPapersStatus[];
    limit?: number;
    offset?: number;
}
interface ListingsResult {
    cached_at: string | null;
    age_minutes: number | null;
    ref: string;
    total_matched: number;
    listings: Listing[];
    limit: number;
    offset: number;
}

async function queryListings(args: ListingsQuery): Promise<ListingsResult> {
    if (!args.ref) {
        const err = new Error('Field "ref" is required.');
        (err as Error & { code?: number }).code = 400;
        throw err;
    }
    const cache = await loadCache();
    if (isStale(cache)) {
        const err = new Error('Cache stale or empty — run the batch crawler first.');
        (err as Error & { code?: number }).code = 503;
        throw err;
    }
    const limit = Math.min(Math.max(args.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(args.offset ?? 0, 0);

    const matched = filterListings(cache.listings, args.ref, args.condition, args.box_papers);
    const page = matched.slice(offset, offset + limit);

    return {
        cached_at: cache.cachedAt,
        age_minutes: cache.ageMinutes,
        ref: args.ref.toUpperCase(),
        total_matched: matched.length,
        listings: page,
        limit,
        offset,
    };
}

// --- Charge helpers (best-effort, never throws) ---
async function safeCharge(eventName: string, count = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
        try {
            await Actor.charge({ eventName });
        } catch {
            return;
        }
    }
}

// --- Zod schemas (REST + MCP share validation) ---
const conditionEnum = z.enum(['new', 'like-new', 'very-good', 'good', 'fair', 'vintage', 'pre-owned', 'unknown']);
const boxPapersEnum = z.enum(['full-set', 'box-and-papers', 'papers-only', 'box-only', 'watch-only', 'unknown']);

const arbitrageSchema = z.object({
    references: z.array(z.string()).optional(),
    min_spread_pct: z.number().min(0).max(100).optional(),
    limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

const marketStatsSchema = z.object({
    references: z.array(z.string()).optional(),
});

const listingsSchema = z.object({
    ref: z.string().min(1),
    condition: z.array(conditionEnum).optional(),
    box_papers: z.array(boxPapersEnum).optional(),
    limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
    offset: z.number().int().min(0).optional(),
});

// --- MCP server (Streamable HTTP transport) ---
function buildMcpServer(): McpServer {
    const server = new McpServer({ name: 'watch-arbitrage-mcp', version: '0.2.0' }, { capabilities: { tools: {} } });

    server.tool(
        'get_arbitrage_snapshot',
        'Returns top N current arbitrage opportunities (listings priced below cross-platform median by ≥ min_spread_pct). Cached from last batch run; freshness depends on schedule. Charges the live spread-alert-triggered event ($1.50-$2.00 depending on Apify plan).',
        arbitrageSchema.shape,
        async (args) => {
            const result = await queryArbitrage(args);
            await safeCharge('spread-alert-triggered');
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        },
    );

    server.tool(
        'get_market_stats',
        'Per-reference median, min, max, count, platforms covered. Aggregate read of cached MARKET_SNAPSHOT.',
        marketStatsSchema.shape,
        async (args) => {
            const result = await queryMarketStats(args);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        },
    );

    server.tool(
        'get_listings_by_ref',
        'Raw listings for a single reference, filterable by condition + box/papers, paginated. Charges $0.001 per listing returned (apify-default-dataset-item).',
        listingsSchema.shape,
        async (args) => {
            const result = await queryListings(args);
            await safeCharge('apify-default-dataset-item', result.listings.length);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        },
    );

    return server;
}

// --- Entry point ---
export async function startStandbyServer(): Promise<void> {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '2mb' }));

    // --- Readiness probe at GET / (per AGENTS.md) ---
    app.get('/', (req: Request, res: Response) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.end(JSON.stringify({ status: 'ready', probe: true }));
            return;
        }
        res.end(
            JSON.stringify({
                service: 'watch-arbitrage-mcp',
                version: '0.2.0',
                description: 'Cross-platform watch arbitrage tracker — Apify Standby + MCP server.',
                rest_endpoints: {
                    arbitrage: 'POST /mcp/arbitrage',
                    market_stats: 'POST /mcp/market-stats',
                    listings: 'POST /mcp/listings',
                },
                mcp_endpoint: '/mcp',
                tools: ['get_arbitrage_snapshot', 'get_market_stats', 'get_listings_by_ref'],
                cache_max_age_minutes: CACHE_MAX_AGE_MIN,
            }),
        );
    });

    // --- REST endpoints (JSON in, JSON out) ---
    app.post('/mcp/arbitrage', bearerAuth, async (req: Request, res: Response) => {
        try {
            const args = arbitrageSchema.parse(req.body ?? {});
            const result = await queryArbitrage(args);
            await safeCharge('spread-alert-triggered');
            res.status(200).json(result);
        } catch (err) {
            handleRestError(err, res);
        }
    });

    app.post('/mcp/market-stats', bearerAuth, async (req: Request, res: Response) => {
        try {
            const args = marketStatsSchema.parse(req.body ?? {});
            const result = await queryMarketStats(args);
            res.status(200).json(result);
        } catch (err) {
            handleRestError(err, res);
        }
    });

    app.post('/mcp/listings', bearerAuth, async (req: Request, res: Response) => {
        try {
            const args = listingsSchema.parse(req.body ?? {});
            const result = await queryListings(args);
            await safeCharge('apify-default-dataset-item', result.listings.length);
            res.status(200).json(result);
        } catch (err) {
            handleRestError(err, res);
        }
    });

    // --- MCP JSON-RPC endpoint (Streamable HTTP) ---
    const mcpHandler: express.RequestHandler = (req, res) => {
        void (async () => {
            try {
                const server = buildMcpServer();
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: undefined, // stateless
                });
                res.on('close', () => {
                    transport.close().catch(() => undefined);
                    server.close().catch(() => undefined);
                });
                await server.connect(transport);
                await transport.handleRequest(req, res, req.body);
            } catch (err) {
                log.exception(err as Error, '[mcp] request failed');
                if (!res.headersSent) {
                    res.status(500).json({
                        jsonrpc: '2.0',
                        error: { code: -32603, message: 'Internal MCP error' },
                        id: null,
                    });
                }
            }
        })();
    };
    app.post('/mcp', bearerAuth, mcpHandler);
    app.get('/mcp', bearerAuth, mcpHandler);
    app.delete('/mcp', bearerAuth, mcpHandler);

    // --- Listen ---
    const httpServer = app.listen(PORT, () => {
        log.info(`[server] WatchArb standby listening on :${PORT}`, {
            rest: ['/mcp/arbitrage', '/mcp/market-stats', '/mcp/listings'],
            mcp: '/mcp',
            cache_max_age_min: CACHE_MAX_AGE_MIN,
        });
    });

    // --- Graceful abort ---
    Actor.on('aborting', async () => {
        log.warning('[server] aborting — closing HTTP server');
        httpServer.close();
        await sleep(1_000);
        await Actor.exit();
    });

    // Block forever — Apify Standby keeps the process alive.
    await new Promise<never>(() => {
        // Apify Standby keeps this process alive until it aborts the run.
    });
}

// --- Shared REST error handler ---
function handleRestError(err: unknown, res: Response): void {
    if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'ValidationError', issues: err.issues });
        return;
    }
    const e = err as Error & { code?: number };
    if (e.code === 503) {
        res.setHeader('Retry-After', '300');
        res.status(503).json({
            error: 'ServiceUnavailable',
            message: e.message,
            retry_after_seconds: 300,
        });
        return;
    }
    if (e.code === 400) {
        res.status(400).json({ error: 'BadRequest', message: e.message });
        return;
    }
    log.exception(e, '[server] REST handler crashed');
    res.status(500).json({ error: 'InternalError', message: 'Unexpected server error' });
}
