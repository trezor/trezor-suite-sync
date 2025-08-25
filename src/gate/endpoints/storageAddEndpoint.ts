import type {ServerType} from "../server.ts";


const schema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                publicKey: {type: 'string'}, // donor
                ownerId: {type: 'number'}, // recipient
                size: {type: "number"},
                proof: {type: 'string'},
                timestamp: {type: 'number'},
            },
            required: ['publicKey', "ownerId", "size", "proof", "timestamp"]
        }
    }
} as const

export const storageAddEndpoint = (server: ServerType) => {
    server.post('/storage/add', schema,
        (request, reply) => {
            const {proof, size, timestamp, publicKey} = request.body;

            // Todo: implement

            return {proof, size, timestamp, publicKey}
        }
    )
}
