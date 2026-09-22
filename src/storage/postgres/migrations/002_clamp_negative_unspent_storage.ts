import { Kysely } from 'kysely';

/**
 * Repairs rows that a concurrent, unguarded debit in `assignSpaceToOwner` drove below zero.
 *
 * Clamping to zero keeps the already granted owner limits intact: the space was handed out, it
 * just was not accounted for on the device. Restoring it would grant the same space twice.
 */
export async function up(db: Kysely<any>): Promise<void> {
    const result = await db
        .updateTable('pubkey_storage_limits')
        .set({ unspentStorageSize: 0 })
        .where('unspentStorageSize', '<', 0)
        .executeTakeFirst();

    // eslint-disable-next-line no-console
    console.log(`clamped ${result.numUpdatedRows} negative unspentStorageSize rows to 0`);
}
