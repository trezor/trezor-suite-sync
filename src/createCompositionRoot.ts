import { randomBytes } from 'crypto';

import { createEvoluRelay } from './evoluRelay/createEvoluRelay.js';
import { UpdateHealthDep } from './health/startHealthServer.js';
import { GenerateRandomBytes } from './quotaManager/GenerateRandomBytes.js';
import { challengeCreateRequestSchema } from './quotaManager/challenge/endpoints/create/challengeCreateSchema.js';
import { createChallengeCreateHandler } from './quotaManager/challenge/endpoints/create/createChallengeCreateHandler.js';
import { createChallengeCreateOperation } from './quotaManager/challenge/endpoints/create/createChallengeCreateOperation.js';
import { createFastifyServer } from './quotaManager/createFastifyServer.js';
import { createQuotaManagerServer } from './quotaManager/createQuotaManagerServer.js';
import { createStorageAddHandler } from './quotaManager/storage/endpoints/add/createStorageAddHandler.js';
import { createStorageAddOperation } from './quotaManager/storage/endpoints/add/createStorageAddOperation.js';
import { storageAddRequestSchema } from './quotaManager/storage/endpoints/add/storageAddSchema.js';
import { createStorageAskHandler } from './quotaManager/storage/endpoints/ask/createStorageAskHandler.js';
import { storageAskRequestSchema } from './quotaManager/storage/endpoints/ask/storageAskSchema.js';
import { createStorageDeleteHandler } from './quotaManager/storage/endpoints/delete/createStorageDeleteHandler.js';
import { createStorageRegisterOperation } from './quotaManager/storage/endpoints/register/createStorageRegisterOperation.js';
import { storageRegisterRequestSchema } from './quotaManager/storage/endpoints/register/storageRegisterSchema.js';
import { createSyncPostHandler } from './quotaManager/sync/endpoints/post/createSyncPostHandler.js';
import { syncPostRequestSchema } from './quotaManager/sync/endpoints/post/syncPostSchema.js';
import { createStorageRegisterHandler } from './quotaManager/storage/endpoints/register/createStorageRegisterHandler.js';
import { createChallengeStorage } from './storage/challengeStorage/challengeStorage.js';
import { createMigrateToLatest } from './storage/createMigrateToLatest.js';
import { createPostgreSql } from './storage/limitStorage/createPostgreSql.js';
import { createLimitStorage } from './storage/limitStorage/limitStorage.js';

type createQuotaManagerCompositionRootDeps = UpdateHealthDep;

export const createCompositionRoot = (deps: createQuotaManagerCompositionRootDeps) => {
    const db = createPostgreSql();

    const migrateToLatest = createMigrateToLatest({ db });

    const createTime = () => Date.now();

    const generateRandomBytes: GenerateRandomBytes = (size: number) =>
        randomBytes(size).toString('hex');

    const limitStorage = createLimitStorage({ db });
    const challengeStorage = createChallengeStorage({ db, createTime });

    const {
        transferSpaceFromDeviceToOwner,
        assignSpaceToOwner,
        getLimitsForOwner,
        getLimitsForPubkey,
        addLimitToPubkey,
    } = limitStorage;

    const fastifyServer = createFastifyServer({ updateHealth: deps.updateHealth });

    const storageAddOperation = createStorageAddOperation({
        challengeStorage,
        assignSpaceToOwner,
    });
    const storageAddHandler = createStorageAddHandler({ storageAddOperation });
    fastifyServer.post('/storage/add', storageAddRequestSchema, storageAddHandler);

    const storageAskHandler = createStorageAskHandler({
        getLimitsForPubkey,
        getLimitsForOwner,
    });
    fastifyServer.post('/storage/ask', storageAskRequestSchema, storageAskHandler);

    const storageRegisterOperation = createStorageRegisterOperation({
        challengeStorage,
        getLimitsForPubkey,
        addLimitToPubkey,
    });
    const storageRegisterHandler = createStorageRegisterHandler({
        storageRegisterOperation,
    });
    fastifyServer.post('/storage/register', storageRegisterRequestSchema, storageRegisterHandler);

    const storageDeleteHandler = createStorageDeleteHandler({
        transferSpaceFromDeviceToOwner,
    });
    fastifyServer.post('/storage/delete', storageRegisterRequestSchema, storageDeleteHandler);

    const syncPostHandler = createSyncPostHandler();
    fastifyServer.post('/sync', syncPostRequestSchema, syncPostHandler);

    const challengeCreateOperation = createChallengeCreateOperation({
        challengeStorage,
        generateRandomBytes,
    });
    const challengeCreateHandler = createChallengeCreateHandler({ challengeCreateOperation });
    fastifyServer.post('/challenge', challengeCreateRequestSchema, challengeCreateHandler);

    const quotaManagerServer = createQuotaManagerServer({
        fastifyServer,
        updateHealth: deps.updateHealth,
    });

    const evoluRelay = createEvoluRelay({ getLimitsForOwner });

    return {
        evoluRelay,
        quotaManagerServer,
        migrateToLatest,
    };
};
