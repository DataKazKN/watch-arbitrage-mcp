#!/usr/bin/env node
/**
 * Daily promotion loop — runs once/day via Claude scheduled task `kazkn-revenue-goal-loop`.
 *
 * Reads state, fetches Apify revenue, decides next action, prints a brief
 * markdown report. The scheduled task picks up that report and executes the
 * action via Claude (which has Chrome MCP, dev.to API, etc.).
 *
 * Usage:
 *   node daily-loop.js            # normal run, print report
 *   node daily-loop.js --dry-run  # don't write state, just report
 *   node daily-loop.js --status   # print loop state without advancing
 *
 * Stop condition: trailing 7-day avg of kazkn revenue ≥ $50/day.
 *
 * State files:
 *   state/loop-state.json
 *   state/action-queue.json
 *   state/revenue-log.jsonl
 *   state/action-log.jsonl
 *   state/winning-plays.md
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const PROMOTION_DIR = path.dirname(path.resolve(__filename));
const STATE_DIR = path.join(PROMOTION_DIR, 'state');
const GOAL_USD = 50;

function readJson(p) {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

function appendJsonl(p, obj) {
    fs.appendFileSync(p, JSON.stringify(obj) + '\n');
}

function readApifyToken() {
    const authFile = path.join(process.env.HOME, '.apify', 'auth.json');
    return JSON.parse(fs.readFileSync(authFile, 'utf8')).token;
}

async function fetchActorRevenue(token, slug) {
    return new Promise((resolve, reject) => {
        const url = `https://api.apify.com/v2/acts/${slug}?token=${token}`;
        https.get(url, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
                try {
                    const data = JSON.parse(body).data;
                    const stats = data.stats || {};
                    // Apify doesn't expose direct $ revenue via API for PPE actors
                    // We approximate using totalRuns × estimated avg revenue per run
                    // from the PPE pricing model. Vinted is ~$0.02/run avg, watch-arb varies.
                    resolve({
                        slug,
                        totalRuns: stats.totalRuns || 0,
                        totalUsers: stats.totalUsers || 0,
                        totalUsers30Days: stats.totalUsers30Days || 0,
                        publicActorRunStats30Days: stats.publicActorRunStats30Days || {},
                        bookmarkCount: stats.bookmarkCount || 0,
                        actorReviewRating: stats.actorReviewRating || 0,
                    });
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function estimateDailyRevenue() {
    const token = readApifyToken();
    const actors = [
        'kazkn~vinted-smart-scraper',
        'kazkn~watch-arbitrage-mcp',
        'kazkn~vinted-mcp-server',
        'kazkn~vinted-turbo-scraper',
        'kazkn~commercial-real-estate-brokerage-intel',
        'kazkn~gpt-crawler-mcp',
    ];

    // Per-actor estimated revenue per run (calibrated from Vinted ~$500/mo / ~22K runs = $0.0227/run)
    const REVENUE_PER_RUN_USD = {
        'kazkn~vinted-smart-scraper': 0.023,
        'kazkn~watch-arbitrage-mcp': 0.06, // PPE event-charged on alerts; higher per run when active
        'kazkn~vinted-mcp-server': 0.02,
        'kazkn~vinted-turbo-scraper': 0.018,
        'kazkn~commercial-real-estate-brokerage-intel': 0.05,
        'kazkn~gpt-crawler-mcp': 0.04,
    };

    let totalMonthly = 0;
    const breakdown = {};
    for (const slug of actors) {
        try {
            const r = await fetchActorRevenue(token, slug);
            const last30dRuns = r.publicActorRunStats30Days?.SUCCEEDED || r.publicActorRunStats30Days?.FINISHED || 0;
            const revenue = last30dRuns * (REVENUE_PER_RUN_USD[slug] ?? 0.02);
            breakdown[slug.replace('kazkn~', '')] = {
                runs_30d: last30dRuns,
                users_30d: r.totalUsers30Days,
                est_revenue_usd: Math.round(revenue * 100) / 100,
            };
            totalMonthly += revenue;
        } catch (e) {
            breakdown[slug] = { error: e.message };
        }
    }
    return { totalMonthly, dailyAvg: totalMonthly / 30, breakdown };
}

function computeTrailingAvg(logFile, days = 7) {
    if (!fs.existsSync(logFile)) return null;
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
    const recent = lines.slice(-days).map((l) => JSON.parse(l));
    if (recent.length === 0) return null;
    const sum = recent.reduce((a, r) => a + (r.daily_avg_usd || 0), 0);
    return sum / recent.length;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const statusOnly = args.includes('--status');

    const stateFile = path.join(STATE_DIR, 'loop-state.json');
    const queueFile = path.join(STATE_DIR, 'action-queue.json');
    const revenueLog = path.join(STATE_DIR, 'revenue-log.jsonl');
    const actionLog = path.join(STATE_DIR, 'action-log.jsonl');

    const state = readJson(stateFile);
    const queue = readJson(queueFile);

    if (statusOnly) {
        console.log(JSON.stringify(state, null, 2));
        return;
    }

    if (state.paused) {
        console.log('# LOOP PAUSED');
        console.log('Yorick set paused: true in state/loop-state.json. Edit that file to resume.');
        return;
    }

    // 1. Measure
    console.log('# Daily loop — ' + new Date().toISOString().slice(0, 10));
    console.log('');
    console.log('## 1. Revenue snapshot');
    let revenue;
    try {
        revenue = await estimateDailyRevenue();
    } catch (e) {
        console.log(`ERROR fetching revenue: ${e.message}`);
        return;
    }
    console.log(`- Monthly estimate: $${Math.round(revenue.totalMonthly * 100) / 100}`);
    console.log(`- Daily avg today: $${Math.round(revenue.dailyAvg * 100) / 100}`);
    for (const [k, v] of Object.entries(revenue.breakdown)) {
        if (v.error) continue;
        console.log(`  · ${k}: ${v.runs_30d} runs/30d, ${v.users_30d} users, $${v.est_revenue_usd}/30d`);
    }

    // Append to revenue log
    const todayRec = {
        date: new Date().toISOString().slice(0, 10),
        kazkn_revenue_30day_usd: Math.round(revenue.totalMonthly * 100) / 100,
        daily_avg_usd: Math.round(revenue.dailyAvg * 100) / 100,
        actor_breakdown: revenue.breakdown,
    };
    if (!dryRun) appendJsonl(revenueLog, todayRec);

    const trailingAvg = computeTrailingAvg(revenueLog, 7) ?? revenue.dailyAvg;
    console.log(`- 7-day trailing avg: $${Math.round(trailingAvg * 100) / 100}`);
    console.log('');

    // 2. Decide
    console.log('## 2. Goal check');
    if (trailingAvg >= GOAL_USD) {
        console.log(`🎉 **GOAL REACHED**: 7-day trailing avg $${trailingAvg.toFixed(2)} ≥ $${GOAL_USD}/day target.`);
        console.log('STOP. No new actions today. Send celebration message to Yorick.');
        if (!dryRun) {
            state.goal_reached_at = new Date().toISOString();
            writeJson(stateFile, state);
        }
        return;
    }
    const gap = GOAL_USD - trailingAvg;
    console.log(`- Gap to goal: $${gap.toFixed(2)}/day (need ${(gap / trailingAvg).toFixed(1)}x lift)`);
    console.log('');

    // 3. Pick action
    console.log('## 3. Next action');
    const idx = state.current_action_index;
    const action = queue.queue[idx];
    if (!action) {
        console.log('Pre-built queue exhausted (Day ' + (state.day_count + 1) + ').');
        console.log('Fall back to category-rotation logic — pick from fallback_actions_after_day_10.');
        console.log('Yorick should review state/action-log.jsonl + winning-plays.md, then refill the queue.');
        return;
    }

    console.log(`Action #${idx + 1} of ${queue.queue.length} (Day ${action.day}):`);
    console.log(`- Category: ${action.category}`);
    console.log(`- Action: ${action.action}`);
    console.log(`- Spec:`);
    console.log(JSON.stringify(action.spec, null, 2).split('\n').map((l) => '  ' + l).join('\n'));
    console.log(`- Expected lift: ${action.expected_lift}`);
    console.log('');

    console.log('## 4. Execution instructions for Claude (the agent reading this)');
    console.log('Run the action above. When done:');
    console.log(`  1. Append result to state/action-log.jsonl`);
    console.log(`  2. Update state/loop-state.json: increment current_action_index, set last_run, increment day_count`);
    console.log(`  3. If action requires Yorick (Reddit post, email send, YouTube film), use TaskCreate to add to his queue`);
    console.log(`  4. Commit + push the state changes to git`);

    if (!dryRun) {
        // Don't auto-advance index — Claude does that AFTER successful execution
        state.last_run = new Date().toISOString();
        writeJson(stateFile, state);
    }
}

main().catch((e) => {
    console.error('Loop failed:', e);
    process.exit(1);
});
