import { type CreateSqliteDriver, Port, ok, testCreateRun } from '@evolu/common';
import { installPolyfills } from '@evolu/common/polyfills';
import { createRelayDeps } from '@evolu/nodejs';
import { describe, expect, it } from 'vitest';

import { createEvoluRelay } from './createEvoluRelay.js';

installPolyfills();

describe(createEvoluRelay.name, () => {
    it('reports the relay as ok while it runs and as exiting when its Run is aborted', async () => {
        const relayStatuses: string[] = [];
        const started = Promise.withResolvers<void>();

        const evoluRelay = createEvoluRelay({
            getLimitsForOwner: () => Promise.resolve(ok(null)),
            updateHealth: ({ relay }) => {
                if (relay === undefined) return;
                relayStatuses.push(relay);
                if (relay === 'ok') started.resolve();
            },
        });

        const relayDeps = createRelayDeps();
        const createSqliteDriver: CreateSqliteDriver = name =>
            relayDeps.createSqliteDriver(name, { mode: 'memory' });
        const run = testCreateRun({ ...relayDeps, createSqliteDriver });

        const fiber = run(evoluRelay({ port: Port.orThrow(0) }));
        await started.promise;
        expect(relayStatuses).toEqual(['ok']);

        const aborted = expect(fiber).rejects.toMatchObject({ type: 'AbortError' });
        await run[Symbol.asyncDispose]();
        await aborted;

        expect(relayStatuses).toEqual(['ok', 'exiting']);
    });
});
