import { type Result, ok } from '@evolu/common';

import { AppDatabaseDep } from '../../postgres/createPostgreSql.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { SessionId } from '../createChallengeStorage.js';

export type DeleteChallengeDeps = AppDatabaseDep;

export type DeleteChallengeParams = {
    sessionId: SessionId;
};

export type DeleteChallenge = (
    params: DeleteChallengeParams,
) => Promise<Result<void, DatabaseError>>;

export type DeleteChallengeDep = { deleteChallenge: DeleteChallenge };

export const createDeleteChallenge =
    (deps: DeleteChallengeDeps): DeleteChallenge =>
    async ({ sessionId }) => {
        const deleteResult = await dbQuery(() =>
            deps.db.deleteFrom('challenges').where('sessionId', '=', sessionId).execute(),
        );

        return deleteResult.ok ? ok(undefined) : deleteResult;
    };
