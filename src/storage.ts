import { type Result, type SqliteError, ok } from '@evolu/common';

import {
    type ChallengeStorage,
    createChallengeStorage,
} from './storage/challengeStorage/challengeStorage.js';
import { type LimitStorage, createLimitStorage } from './storage/limitStorage/limitStorage.js';
import { prepareSqlite } from './storage/prepareSqlite.js';

export type AppStorage = {
    limitStorage: LimitStorage;
    challengeStorage: ChallengeStorage;
};

export const createAppStorage = async (): Promise<Result<AppStorage, SqliteError>> => {
    const sqlite = await prepareSqlite();

    if (!sqlite.ok) {
        return sqlite;
    }

    const limitStorage = createLimitStorage({ sqlite: sqlite.value });

    if (!limitStorage.ok) {
        return limitStorage;
    }

    const challengeStorage = createChallengeStorage({ sqlite: sqlite.value });

    if (!challengeStorage.ok) {
        return challengeStorage;
    }

    return ok({
        limitStorage: limitStorage.value,
        challengeStorage: challengeStorage.value,
    });
};
