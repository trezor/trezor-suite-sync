import { createConsole, createConsoleFormatter } from '@evolu/common';
import { createRelayDeps, createRun, startRelay } from '@evolu/nodejs';

import { IS_DEV_SERVER } from '../env.js';
import { UpdateHealthDep } from '../health/createHealthServer.js';
import { GetLimitsForOwnerDep } from '../storage/limitStorage/methods/createGetLimitsForOwner.js';

export type EvoluRelayDeps = GetLimitsForOwnerDep & UpdateHealthDep;

export type EvoluRelayParams = {
    port: number;
};

export type EvoluRelay = (params: EvoluRelayParams) => Promise<void>;

export type EvoluRelayDep = { evoluRelay: EvoluRelay };

/**
 * Writes directly to stdout with an ISO timestamp, bypassing the Evolu
 * console abstraction so these lines are always visible regardless of the
 * configured log level.
 */
const relayLog = (msg: string): void => {
    process.stdout.write(`[RELAY-VERBOSE ${new Date().toISOString()}] ${msg}\n`);
};

export const createEvoluRelay =
    (deps: EvoluRelayDeps): EvoluRelay =>
    async ({ port }) => {
        const console = createConsole({
            level: IS_DEV_SERVER ? 'debug' : 'info',
            formatter: createConsoleFormatter()({
                timestampFormat: 'relative',
            }),
        });

        relayLog(`Starting relay on port ${port}`);

        const run = createRun({
            ...createRelayDeps(),
            console,
        });
        const stack = new AsyncDisposableStack();
        let relayStarted = false;

        try {
            const relay = await run.orThrow(
                startRelay({
                    port,

                    /**
                     * Owner is allowed to access the relay if they have any registered storage limit.
                     */
                    async isOwnerAllowed(ownerId) {
                        const result = await deps.getLimitsForOwner({ ownerId });
                        const allowed = result.ok && result.value !== null;
                        if (allowed) {
                            relayLog(
                                `Client connection accepted ownerId=${ownerId} quota_limit=${result.value}`,
                            );
                        } else {
                            const reason = !result.ok
                                ? `db_error:${JSON.stringify(result)}`
                                : 'no_quota_record';
                            relayLog(
                                `Client connection rejected ownerId=${ownerId} reason=${reason}`,
                            );
                        }
                        return Promise.resolve(allowed);
                    },

                    /**
                     * Owner is allowed to write if his usedBytes + requiredBytes <= storage limit.
                     * NOTE: Required bytes are not only required bytes for upload, but also the already used storage.
                     */
                    async isOwnerWithinQuota(ownerId, requiredBytes) {
                        const result = await deps.getLimitsForOwner({ ownerId });
                        const allowed =
                            result.ok && result.value !== null && result.value >= requiredBytes;
                        if (allowed) {
                            relayLog(
                                `Write stored ownerId=${ownerId} bytes=${requiredBytes} limit=${result.value}`,
                            );
                        } else {
                            const reason = !result.ok
                                ? 'db_error'
                                : result.value === null
                                  ? 'no_quota_record'
                                  : `quota_exceeded used=${requiredBytes} limit=${result.value}`;
                            relayLog(`Write denied ownerId=${ownerId} reason=${reason}`);
                        }
                        return Promise.resolve(allowed);
                    },
                }),
            );

            stack.use(relay);
            relayStarted = true;
            deps.updateHealth({ relay: 'ok' });
            relayLog(`Relay up and healthy on port ${port}`);

            await run.deps.shutdown;
        } catch (error) {
            console.error('Relay failed', error);
            relayLog(`Relay FAILED: ${String(error)}`);
            deps.updateHealth({ relay: 'error' });

            return;
        } finally {
            if (relayStarted) {
                console.log('Evolu Relay is shutting down ...');
                deps.updateHealth({ relay: 'exiting' });
            }

            await stack[Symbol.asyncDispose]();
            await run[Symbol.asyncDispose]();
        }
    };
