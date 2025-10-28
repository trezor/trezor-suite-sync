import { sql, type Sqlite, type SqliteError, ok, type Result } from '@evolu/common';

export type ChallengeStorage = {
    validateAndConsumeChallenge: (
        sessionId: string,
        challenge: string,
    ) => Result<boolean, SqliteError>;
    storeChallenge: (
        sessionId: string,
        challenge: string,
        expiresInSeconds?: number,
    ) => Result<void, SqliteError>;
    cleanupExpiredChallenges: () => Result<void, SqliteError>;
};

const CHALLENGES_TABLE_NAME = 'challenges';
const DEFAULT_EXPIRATION_SECONDS = 30;

const createChallengesTableQuery = sql`
    create table if not exists ${sql.identifier(CHALLENGES_TABLE_NAME)} (
        sessionId text primary key,
        challenge text not null,
        createdAt integer not null
    ) strict;
`;

export type ChallengeStorageDependencies = {
    sqlite: Sqlite;
    createTime?: () => number;
};

// Todo: split to functions, similar to LimitStorage

export const createChallengeStorage = ({
    sqlite,
    createTime = () => Date.now(),
}: ChallengeStorageDependencies): ChallengeStorage => {
    const createTableResult = sqlite.exec(createChallengesTableQuery);

    if (!createTableResult.ok) {
        return {
            storeChallenge: () => createTableResult,
            validateAndConsumeChallenge: () => createTableResult,
            cleanupExpiredChallenges: () => createTableResult,
        };
    }

    const deleteChallenge = (sessionId: string): Result<void, SqliteError> => {
        const deleteResult = sqlite.exec(sql`
            DELETE FROM ${sql.identifier(CHALLENGES_TABLE_NAME)} 
            WHERE sessionId = ${sessionId}
        `);

        return deleteResult.ok ? ok(undefined) : deleteResult;
    };

    return {
        storeChallenge: (
            sessionId: string,
            challenge: string,
            expiresInSeconds: number = DEFAULT_EXPIRATION_SECONDS,
        ): Result<void, SqliteError> => {
            const now = createTime();

            const result = sqlite.exec(sql`
                INSERT OR REPLACE INTO ${sql.identifier(CHALLENGES_TABLE_NAME)} (sessionId, challenge, createdAt)
                VALUES (${sessionId}, ${challenge}, ${now})
            `);

            return result.ok ? ok(undefined) : result;
        },

        validateAndConsumeChallenge: (
            sessionId: string,
            challenge: string,
        ): Result<boolean, SqliteError> => {
            const now = createTime();
            const expirationThreshold = now - DEFAULT_EXPIRATION_SECONDS * 1000;

            const selectResult = sqlite.exec<{ challenge: string }>(sql`
                SELECT challenge FROM ${sql.identifier(CHALLENGES_TABLE_NAME)} 
                WHERE sessionId = ${sessionId} AND createdAt > ${expirationThreshold}
            `);

            if (!selectResult.ok) {
                return selectResult;
            }

            if (selectResult.value.rows.length === 0) {
                return ok(false);
            }

            const [row] = selectResult.value.rows;

            if (!row || row.challenge !== challenge) {
                return ok(false);
            }

            const deleteResult = deleteChallenge(sessionId);

            if (!deleteResult.ok) {
                return deleteResult;
            }

            return ok(true);
        },

        cleanupExpiredChallenges: (): Result<void, SqliteError> => {
            const now = createTime();
            const expirationThreshold = now - DEFAULT_EXPIRATION_SECONDS * 1000;

            const result = sqlite.exec(sql`
                DELETE FROM ${sql.identifier(CHALLENGES_TABLE_NAME)} 
                WHERE createdAt <= ${expirationThreshold}
            `);

            return result.ok ? ok(undefined) : result;
        },
    };
};
