import { describe, expect, it, vi } from 'vitest';

import { chargeReferenceMonitoring } from '../src/billing.js';

describe('reference monitoring billing guard', () => {
    it('only returns references that cleared the reference-monitored charge before the spending limit', async () => {
        const charge = vi
            .fn()
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ eventChargeLimitReached: true });
        const warn = vi.fn();

        const result = await chargeReferenceMonitoring(['5711/1A-010', '116500LN', '124060', '15500ST'], {
            charge,
            warn,
        });

        expect(result.referencesToMonitor).toEqual(['5711/1A-010', '116500LN']);
        expect(result.chargedReferencesCount).toBe(2);
        expect(result.limitReached).toBe(true);
        expect(charge).toHaveBeenCalledTimes(3);
        expect(charge).toHaveBeenCalledWith({ eventName: 'reference-monitored' });
        expect(warn).toHaveBeenCalledOnce();
    });

    it('stops at the first charge failure instead of monitoring unpaid references', async () => {
        const charge = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('billing unavailable'));
        const warn = vi.fn();

        const result = await chargeReferenceMonitoring(['5711/1A-010', '116500LN', '124060'], {
            charge,
            warn,
        });

        expect(result.referencesToMonitor).toEqual(['5711/1A-010']);
        expect(result.chargedReferencesCount).toBe(1);
        expect(result.limitReached).toBe(true);
        expect(charge).toHaveBeenCalledTimes(2);
        expect(warn).toHaveBeenCalledOnce();
    });
});
