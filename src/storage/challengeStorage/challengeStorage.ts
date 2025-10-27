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

const createChallengesTableQuery = sql`
    create table if not exists ${sql.identifier(CHALLENGES_TABLE_NAME)} (
        sessionId text primary key,
        challenge text not null,
        createdAt integer not null,
        expiresAt integer not null
    ) strict;
`;

export type ChallengeStorageDependencies = {
    sqlite: Sqlite;
};

export const createChallengeStorage = ({
    sqlite,
}: ChallengeStorageDependencies): ChallengeStorage => {
    const createTableResult = sqlite.exec(createChallengesTableQuery);

    if (!createTableResult.ok) {
        throw new Error('Failed to create challenges table');
    }

    return {
        storeChallenge: (
            sessionId: string,
            challenge: string,
            expiresInSeconds: number = 300,
        ): Result<void, SqliteError> => {
            const now = Date.now();
            const expiresAt = now + expiresInSeconds * 1000;

            const result = sqlite.exec(sql`
                INSERT OR REPLACE INTO ${sql.identifier(CHALLENGES_TABLE_NAME)} (sessionId, challenge, createdAt, expiresAt)
                VALUES (${sessionId}, ${challenge}, ${now}, ${expiresAt})
            `);

            return result.ok ? ok(undefined) : result;
        },

        validateAndConsumeChallenge: (
            sessionId: string,
            challenge: string,
        ): Result<boolean, SqliteError> => {
            const selectResult = sqlite.exec<{ challenge: string; expiresAt: number }>(sql`
                SELECT challenge, expiresAt FROM ${sql.identifier(CHALLENGES_TABLE_NAME)} 
                WHERE sessionId = ${sessionId}
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

            if (Date.now() > row.expiresAt) {
                sqlite.exec(sql`
                    DELETE FROM ${sql.identifier(CHALLENGES_TABLE_NAME)} WHERE sessionId = ${sessionId}
                `);
                return ok(false);
            }

            const deleteResult = sqlite.exec(sql`
                DELETE FROM ${sql.identifier(CHALLENGES_TABLE_NAME)} WHERE sessionId = ${sessionId}
            `);

            if (!deleteResult.ok) {
                return deleteResult;
            }

            return ok(true);
        },

        cleanupExpiredChallenges: (): Result<void, SqliteError> => {
            const now = Date.now();
            const result = sqlite.exec(sql`
                DELETE FROM ${sql.identifier(CHALLENGES_TABLE_NAME)} 
                WHERE expiresAt < ${now}
            `);

            return result.ok ? ok(undefined) : result;
        },
    };
};
