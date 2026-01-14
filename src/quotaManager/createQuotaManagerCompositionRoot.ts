import { randomBytes } from 'crypto';

import { GenerateRandomBytes } from './GenerateRandomBytes.js';
import { createFastifyServer } from './createFastifyServer.js';
import { createQuotaManagerServer } from './createQuotaManagerServer.js';
import { UpdateHealthDep } from '../health/startHealthServer.js';
import { createChallengeStorage } from '../storage/challengeStorage/challengeStorage.js';
import { createMigrateToLatest } from '../storage/createMigrateToLatest.js';
import { createPostgreSql } from '../storage/limitStorage/createPostgreSql.js';
import { createLimitStorage } from '../storage/limitStorage/limitStorage.js';
import { challengeCreateRequestSchema } from './challenge/endpoints/create/challengeCreateSchema.js';
import { createChallengeCreateHandler } from './challenge/endpoints/create/createChallengeCreateHandler.js';
import { createChallengeCreateOperation } from './challenge/endpoints/create/createChallengeCreateOperation.js';
import { createStorageAddHandler } from './storage/endpoints/add/createStorageAddHandler.js';
import { createStorageAddOperation } from './storage/endpoints/add/createStorageAddOperation.js';
import { storageAddRequestSchema } from './storage/endpoints/add/storageAddSchema.js';
import { createStorageAskHandler } from './storage/endpoints/ask/createStorageAskHandler.js';
import { storageAskRequestSchema } from './storage/endpoints/ask/storageAskSchema.js';
import { createStorageDeleteHandler } from './storage/endpoints/delete/createStorageDeleteHandler.js';
import { createStorageRegisterHandler } from './storage/endpoints/register/createStorageRegisterHandler.js';
import { createStorageRegisterOperation } from './storage/endpoints/register/createStorageRegisterOperation.js';
import { storageRegisterRequestSchema } from './storage/endpoints/register/storageRegisterSchema.js';
import { createSyncPostHandler } from './sync/endpoints/post/createSyncPostHandler.js';
import { syncPostRequestSchema } from './sync/endpoints/post/syncPostSchema.js';

type createQuotaManagerCompositionRootDeps = UpdateHealthDep;

export const createQuotaManagerCompositionRoot = (deps: createQuotaManagerCompositionRootDeps) => {
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
    fastifyServer.get('/storage/ask', storageAskRequestSchema, storageAskHandler);

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

    const quotaManagerServer = createQuotaManagerServer({
        fastifyServer,
        updateHealth: deps.updateHealth,
    });

    const syncPostHandler = createSyncPostHandler();
    fastifyServer.post('/sync', syncPostRequestSchema, syncPostHandler);

    const challengeCreateOperation = createChallengeCreateOperation({
        challengeStorage,
        generateRandomBytes,
    });
    const challengeCreateHandler = createChallengeCreateHandler({ challengeCreateOperation });
    fastifyServer.post('/challenge', challengeCreateRequestSchema, challengeCreateHandler);

    return {
        limitStorage, // Todo: remove
        quotaManagerServer,
        migrateToLatest,
    };
};
