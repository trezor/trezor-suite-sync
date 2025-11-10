## Trezor Evolu Relay

### Quota Manager (Payment Server)

- Spec: https://www.notion.so/satoshilabs/Gate-API-specification-24edc526060680d5beffdfcd476a4974

### Run

```bash
nvm i
yarn
yarn build
yarn start
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
