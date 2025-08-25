import fastify from 'fastify'

const server = fastify()

server.get('/ping', async (request, reply) => {
    return 'pong 4';
})

server.listen({port: 8080}, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
