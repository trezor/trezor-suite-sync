import { type Result, ok } from '@evolu/common';

import { CreateTimeDep } from '../../../CreateTime.js';
import { AppDatabaseDep } from '../../posgres/createPostgreSql.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { Challenge, SessionId } from '../createChallengeStorage.js';

export type StoreChallengeDeps = AppDatabaseDep & CreateTimeDep;

export type StoreChallengeParams = {
    sessionId: SessionId;
    challenge: Challenge;
    expiresInSeconds?: number;
};

export type StoreChallenge = (params: StoreChallengeParams) => Promise<Result<void, DatabaseError>>;

export type StoreChallengeDep = { storeChallenge: StoreChallenge };

const DEFAULT_EXPIRATION_SECONDS = 30;

export const createStoreChallenge =
    (deps: StoreChallengeDeps): StoreChallenge =>
    async ({ sessionId, challenge, expiresInSeconds = DEFAULT_EXPIRATION_SECONDS }) => {
        const now = deps.createTime();

        // TODO fix CONSTRAINT err
        const result = await dbQuery(() =>
            deps.db
                .insertInto('challenges')
                .values({
                    sessionId,
                    challenge,
                    createdAt: now,
                })
                .onConflict(oc =>
                    oc.column('sessionId').doUpdateSet({
                        challenge,
                        createdAt: now,
                    }),
                )
                .execute(),
        );

        return result.ok ? ok(undefined) : result;
    };
