import { sql } from '@evolu/common';

export const PUBKEY_STORAGE_LIMITS_TABLE_NAME = 'pubkey_storage_limits';
export const OWNER_STORAGE_LIMITS_TABLE_NAME = 'owner_storage_limits';

export const createPubkeyLimitTableQueryIfNotExists = sql`
    create table if not exists ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)} (
      "publicKey" text not null,
      "totalStorageSize" int not null,
      "unspendStorageSize" INT not null,
      primary key ("publicKey")
    )
    strict;
`;

export const createOwnerLimitTableQueryIfNotExists = sql`
    create table if not exists ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} (
      "ownerId" text not null,
      "storageLimit" int not null,
      primary key ("ownerId")
    )
    strict;
`;
