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
yarn start-metrics
```

Prometheus is included in `docker compose up` for local metric checks. It uses host networking and
scrapes the metrics server running on the host at `http://localhost:4003/metrics`.

You can change ports by setting the ENV variables:

```bash
QUOTA_MANAGER_PORT=1111 RELAY_PORT=2222 METRICS_PORT=3333 yarn start
```

### Dev

```bash
nvm i
yarn dev
```

### Kubernetes Deployment

Manifests live in `.k8s/` and use [Kustomize](https://kustomize.io/) overlays for production and development.

Each overlay deploys:

- **evolu-relay** -- Evolu sync relay (port 4000)
- **quota-manager** -- Payment/quota server (port 4001)
- **quota-manager-metrics** -- internal Prometheus metrics service for the quota-manager metrics sidecar (port 4003, `/metrics`)
- **postgres** -- PostgreSQL StatefulSet with persistent storage

Production runs 2 quota-manager replicas; development runs 1.

### API

- Good API tool to play with API: https://www.usebruno.com/downloads
- We have collection for this
