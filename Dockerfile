FROM node:24-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

RUN corepack enable
RUN corepack prepare yarn@4.10.3 --activate 

WORKDIR /app

COPY . .

# Set environment variables for native module builds
ENV npm_config_cache=/tmp/.npm

RUN yarn install
RUN yarn build

FROM node:24-alpine

RUN corepack enable
RUN corepack prepare yarn@4.10.3 --activate 

WORKDIR /app

COPY --from=builder /app .

EXPOSE 4000 4001

# Todo: this needs to be "yarn start-quota-manager" or "yarn start-evolu-relay"
CMD ["yarn", "start"]
