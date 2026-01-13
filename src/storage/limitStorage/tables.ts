import { AppDatabase } from './createPostgreSql.js';
import { dbQuery } from '../utils/dbQuery.js';

export const PUBKEY_STORAGE_LIMITS_TABLE_NAME = 'pubkey_storage_limits';
export const OWNER_STORAGE_LIMITS_TABLE_NAME = 'owner_storage_limits';

export const createPubkeyLimitTableIfNotExists = async (db: AppDatabase) =>
    await dbQuery(async () => {
        await db.schema
            .createTable(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
            .ifNotExists()
            .addColumn('publicKey', 'text', col => col.notNull().primaryKey())
            .addColumn('totalStorageSize', 'integer', col => col.notNull())
            .addColumn('unspendStorageSize', 'integer', col => col.notNull())
            .execute();
    });

export const createOwnerLimitTableIfNotExists = async (db: AppDatabase) =>
    await dbQuery(() =>
        db.schema
            .createTable(OWNER_STORAGE_LIMITS_TABLE_NAME)
            .ifNotExists()
            .addColumn('ownerId', 'text', col => col.notNull().primaryKey())
            .addColumn('storageLimit', 'integer', col => col.notNull())
            .execute(),
    );

export const createChallengesTableIfNotExists = async (db: AppDatabase) =>
    await dbQuery(() =>
        db.schema
            .createTable('challenges')
            .ifNotExists()
            .addColumn('sessionId', 'text', col => col.notNull().primaryKey())
            .addColumn('challenge', 'text', col => col.notNull())
            .addColumn('createdAt', 'bigint', col => col.notNull())
            .execute(),
    );
