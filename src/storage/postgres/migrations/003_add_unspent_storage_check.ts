import { Kysely, sql } from 'kysely';

/**
 * Backs the accounting invariant at the schema level: a debit that would overdraw a device now
 * fails its transaction instead of leaving the device permanently unusable.
 */
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('pubkey_storage_limits')
        .addCheckConstraint('unspentStorageSize_non_negative', sql`"unspentStorageSize" >= 0`)
        .execute();
}
