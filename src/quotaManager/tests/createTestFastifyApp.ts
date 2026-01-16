import Fastify from 'fastify';

import { createChallengeStorage } from '../../storage/challengeStorage/createChallengeStorage.js';
import { createLimitStorage } from '../../storage/limitStorage/limitStorage.js';
import { createAddLimitToPubkey } from '../../storage/limitStorage/methods/createAddLimitToPubkey.js';
import { createGetLimitsForPubkey } from '../../storage/limitStorage/methods/createGetLimitsForPubkey.js';
import { createTestDatabase } from '../../storage/posgres/createTestDatabase.js';

/**
 * This is tool to set up whole QuotaManager App in test environment
 */
export const createTestFastifyApp = async () => {
    const db = await createTestDatabase();

    const challengeStorage = createChallengeStorage({
        db,
        createTime: () => Date.now(), // Todo: AI mock fixed date
    });

    const getLimitsForPubkey = createGetLimitsForPubkey({ db });
    const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });

    const limitStorage = createLimitStorage({ db });

    const app = Fastify();

    return { db, limitStorage, challengeStorage, addLimitToPubkey, app };
};
