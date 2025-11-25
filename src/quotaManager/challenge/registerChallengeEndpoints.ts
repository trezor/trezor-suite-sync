import type { ChallengeStorage } from '../../storage/challengeStorage/challengeStorage.js';
import type { ServerType } from '../types.js';
import { challengeCreateEndpoint } from './endpoints/create/challengeCreateEndpoint.js';

export type RegisterChallengeEndpointsDeps = {
    server: ServerType;
    challengeStorage: ChallengeStorage;
    createRandomBytes: (size: number) => string;
};

export const registerChallengeEndpoints = ({
    server,
    challengeStorage,
    createRandomBytes,
}: RegisterChallengeEndpointsDeps) => {
    server.post(
        '/challenge',
        challengeCreateEndpoint.schema,
        challengeCreateEndpoint.createHandler({ challengeStorage, createRandomBytes }),
    );
};
