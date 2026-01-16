import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('pubkey_storage_limits')
        .ifNotExists()
        .addColumn('publicKey', 'text', col => col.notNull().primaryKey())
        .addColumn('totalStorageSize', 'integer', col => col.notNull())
        .addColumn('unspendStorageSize', 'integer', col => col.notNull())
        .execute();

    await db.schema
        .createTable('owner_storage_limits')
        .ifNotExists()
        .addColumn('ownerId', 'text', col => col.notNull().primaryKey())
        .addColumn('storageLimit', 'integer', col => col.notNull())
        .execute();

    await db.schema
        .createTable('challenges')
        .ifNotExists()
        .addColumn('sessionId', 'text', col => col.notNull().primaryKey())
        .addColumn('challenge', 'text', col => col.notNull())
        .addColumn('createdAt', 'bigint', col => col.notNull())
        .execute();
}
