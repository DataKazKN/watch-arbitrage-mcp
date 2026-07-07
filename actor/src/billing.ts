export interface ReferenceMonitoringChargeResult {
    eventChargeLimitReached?: boolean;
}

export interface ReferenceMonitoringBillingDeps {
    charge: (payload: {
        eventName: 'reference-monitored';
    }) => Promise<ReferenceMonitoringChargeResult | null | undefined>;
    warn: (message: string) => void;
}

export interface ReferenceMonitoringBillingResult {
    referencesToMonitor: string[];
    chargedReferencesCount: number;
    limitReached: boolean;
}

export async function chargeReferenceMonitoring(
    references: string[],
    deps: ReferenceMonitoringBillingDeps,
): Promise<ReferenceMonitoringBillingResult> {
    const referencesToMonitor: string[] = [];

    for (const ref of references) {
        let result: ReferenceMonitoringChargeResult | null | undefined;
        try {
            result = await deps.charge({ eventName: 'reference-monitored' });
        } catch (err) {
            deps.warn(`Reference monitoring charge failed. Skipping uncharged references. ${String(err)}`);
            return {
                referencesToMonitor,
                chargedReferencesCount: referencesToMonitor.length,
                limitReached: true,
            };
        }

        if (result?.eventChargeLimitReached) {
            deps.warn('User spending limit reached on reference-monitored. Skipping uncharged references.');
            return {
                referencesToMonitor,
                chargedReferencesCount: referencesToMonitor.length,
                limitReached: true,
            };
        }
        referencesToMonitor.push(ref);
    }

    return {
        referencesToMonitor,
        chargedReferencesCount: referencesToMonitor.length,
        limitReached: false,
    };
}
