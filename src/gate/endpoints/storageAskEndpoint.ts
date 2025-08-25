import type {ServerType} from "../server.ts";


const schema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                ownerId: {type: 'string'},
                publickKey: {type: 'string'},
            },
            required: []
        }
    }
} as const

export const storageAddEndpoint = (server: ServerType) => {
    server.post('/storage/ask', schema,
        (request, reply) => {
            const {ownerId, publickKey} = request.query

            // Todo: implement

            return {ownerId, publickKey}
        }
    )
}
