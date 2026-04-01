FROM node:24-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ git

RUN corepack enable
RUN corepack prepare yarn@4.12.0 --activate

# Set environment variables for native module builds
ENV npm_config_cache=/tmp/.npm

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

COPY .yarn/ .yarn/

RUN yarn install

COPY . .

RUN yarn build

FROM node:24-alpine

RUN corepack enable
RUN corepack prepare yarn@4.12.0 --activate

WORKDIR /app

COPY --from=builder /app .

EXPOSE 4000 4001

# Todo: this needs to be "yarn start-quota-manager" or "yarn start-evolu-relay"
CMD ["yarn", "start"]
