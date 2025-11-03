import type { ChallengeStorage } from '../../storage/challengeStorage/challengeStorage.js';
import type { ServerType } from '../server.js';
import { challengeCreateEndpoint } from './endpoints/create/endpoint.js';

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
    // POST /challenge
    server.post(
        challengeCreateEndpoint.path,
        challengeCreateEndpoint.schema,
        challengeCreateEndpoint.createHandler({ challengeStorage, createRandomBytes }),
    );
};
