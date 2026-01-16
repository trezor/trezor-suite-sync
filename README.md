## Trezor Evolu Relay

### Quota Manager (Payment Server)

- Spec: https://www.notion.so/satoshilabs/Gate-API-specification-24edc526060680d5beffdfcd476a4974

### Run

Run database (1st terminal):

```bash
cp .env.sample .env 
docker compose up
```

> If you need to purge database for test purposed: `docker rm postgres`

Run node stuff (2nd terminal):

```bash
nvm i
yarn
yarn build
yarn start-quota-manager
yarn start-evolu-relay
```

You can change ports by setting the ENV variables:

```bash
QUOTA_MANAGER_PORT=1111 RELAY_PORT=2222 yarn start
```

### Dev

```bash
nvm i
yarn dev
```

### API

- Good API tool to play with API: https://www.usebruno.com/downloads
- We have collection for this
