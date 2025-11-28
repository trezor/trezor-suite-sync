import { type Result, ok } from '@evolu/common';

import {
    type ChallengeStorage,
    createChallengeStorage,
} from './storage/challengeStorage/challengeStorage.js';
import { type LimitStorage, createLimitStorage } from './storage/limitStorage/limitStorage.js';
import { preparePostgreSql } from './storage/limitStorage/preparePostgreSql.js';
import { DatabaseError } from './storage/utils/dbQuery.js';

export type AppStorage = {
    limitStorage: LimitStorage;
    challengeStorage: ChallengeStorage;
};

export const createAppStorage = async (): Promise<Result<AppStorage, DatabaseError>> => {
    const db = preparePostgreSql();

    const limitStorage = await createLimitStorage({ db });

    const challengeStorage = await createChallengeStorage({ db });

    if (!challengeStorage.ok) {
        return challengeStorage;
    }

    return ok({
        limitStorage: limitStorage.value,
        challengeStorage: challengeStorage.value,
    });
};
