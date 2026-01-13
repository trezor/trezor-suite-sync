import Fastify from 'fastify';
// eslint-disable-next-line import/no-extraneous-dependencies
import { assert } from 'vitest';

import { createChallengeStorage } from '../../storage/challengeStorage/challengeStorage.js';
import { createTestDatabase } from '../../storage/limitStorage/createTestDatabase.js';
import { createLimitStorage } from '../../storage/limitStorage/limitStorage.js';
import { createAddLimitToPubkey } from '../../storage/limitStorage/methods/createAddLimitToPubkey.js';
import { createGetLimitsForPubkey } from '../../storage/limitStorage/methods/createGetLimitsForPubkey.js';

// Todo: AI unify with top-level compositionroot
const createTestAppCompositionRoot = () => {
    const db = createTestDatabase();

    const challengeStorage = createChallengeStorage({
        db,
        createTime: () => Date.now(), // Todo: AI mock fixed date
    });

    const getLimitsForPubkey = createGetLimitsForPubkey({ db });
    const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });

    const limitStorage = createLimitStorage({ db });

    return { db, limitStorage, challengeStorage, addLimitToPubkey };
};

/**
 * This is tool to set up whole QuotaManager App in test environment
 */
export const createTestFastifyApp = async () => {
    const services = createTestAppCompositionRoot();

    assert((await services.challengeStorage.ensureTables()).ok);
    assert((await services.limitStorage.ensureTables()).ok);

    const app = Fastify();

    return { ...services, app };
};
