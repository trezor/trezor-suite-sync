import { type Result, ok } from '@evolu/common';

import { AppDatabaseDep } from '../../postgres/createPostgreSql.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';

export type CleanupExpiredChallengesDeps = AppDatabaseDep & {
    createTime: () => number;
};

export type CleanupExpiredChallenges = () => Promise<Result<void, DatabaseError>>;

export type CleanupExpiredChallengesDep = {
    cleanupExpiredChallenges: CleanupExpiredChallenges;
};

const DEFAULT_EXPIRATION_SECONDS = 30;
const CHALLENGES_TABLE_NAME = 'challenges';

export const createCleanupExpiredChallenges =
    (deps: CleanupExpiredChallengesDeps): CleanupExpiredChallenges =>
    async () => {
        const now = deps.createTime();
        const expirationThreshold = now - DEFAULT_EXPIRATION_SECONDS * 1000;

        const result = await dbQuery(() =>
            deps.db
                .deleteFrom(CHALLENGES_TABLE_NAME)
                .where('createdAt', '<=', expirationThreshold)
                .execute(),
        );

        return result.ok ? ok(undefined) : result;
    };
