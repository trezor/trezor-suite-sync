import {
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../../../storage/limitStorage/limitStorage.js';

export type TransferResponse = {
    proof: Proof;
    size: Size;
    timestamp: Timestamp;
    publicKey: PublicKey;
};

export const serializeTransferResponse = (data: {
    proof: Proof;
    size: Size;
    timestamp: Timestamp;
    publicKey: PublicKey;
}): TransferResponse => data;
