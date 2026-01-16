import { type Result, ok } from '@evolu/common';

import { DeleteChallengeDep } from './createDeleteChallenge.js';
import { AppDatabaseDep } from '../../posgres/createPostgreSql.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { Challenge, SessionId } from '../createChallengeStorage.js';

export type ValidateAndConsumeChallengeDeps = AppDatabaseDep &
    DeleteChallengeDep & {
        createTime: () => number;
    };

export type ValidateAndConsumeChallengeParams = {
    sessionId: SessionId;
    challenge: Challenge;
};

export type ValidateAndConsumeChallenge = (
    params: ValidateAndConsumeChallengeParams,
) => Promise<Result<boolean, DatabaseError>>;

export type ValidateAndConsumeChallengeDep = {
    validateAndConsumeChallenge: ValidateAndConsumeChallenge;
};

const DEFAULT_EXPIRATION_SECONDS = 30;
const CHALLENGES_TABLE_NAME = 'challenges';

export const createValidateAndConsumeChallenge =
    (deps: ValidateAndConsumeChallengeDeps): ValidateAndConsumeChallenge =>
    async ({ sessionId, challenge }) => {
        const now = deps.createTime();
        const expirationThreshold = now - DEFAULT_EXPIRATION_SECONDS * 1000;

        const selectResult = await dbQuery(() =>
            deps.db
                .selectFrom(CHALLENGES_TABLE_NAME)
                .where('sessionId', '=', sessionId)
                .where('createdAt', '>', expirationThreshold)
                .select(['challenge'])
                .execute(),
        );

        if (!selectResult.ok) {
            return selectResult;
        }

        if (selectResult.value.length === 0) {
            return ok(false);
        }

        const [row] = selectResult.value;

        if (!row || row.challenge !== challenge) {
            return ok(false);
        }

        const deleteResult = await deps.deleteChallenge({ sessionId });

        if (!deleteResult.ok) {
            return deleteResult;
        }

        return ok(true);
    };
