import { ok, type Result, type SqliteError } from '@evolu/common';
import {
    prepareSqlite,
    createLimitStorage,
    type LimitStorage,
} from './limitStorage/limitStorage.js';
import {
    createChallengeStorage,
    type ChallengeStorage,
} from './challengeStorage/challengeStorage.js';

export type AppStorage = {
    limitStorage: LimitStorage;
    challengeStorage: ChallengeStorage;
};

export const createAppStorage = async (): Promise<Result<AppStorage, SqliteError>> => {
    const sqlite = await prepareSqlite();

    if (!sqlite.ok) {
        return sqlite;
    }

    const limitStorage = createLimitStorage(sqlite.value);
    const challengeStorage = createChallengeStorage({ sqlite: sqlite.value });

    return ok({
        limitStorage,
        challengeStorage,
    });
};
