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

# Build argument to specify which service to run
ARG SERVICE=quota-manager
ENV SERVICE=${SERVICE}

# Expose ports for both services (they won't conflict as only one runs)
EXPOSE 4000 4001 4002

# Create entrypoint script
RUN cat > /entrypoint.sh << 'EOF' && chmod +x /entrypoint.sh
#!/bin/sh
if [ "$SERVICE" = "quota-manager" ]; then
  exec yarn start-quota-manager
elif [ "$SERVICE" = "evolu-relay" ]; then
  exec yarn start-evolu-relay
else
  echo "Error: SERVICE must be either 'quota-manager' or 'evolu-relay'"
  exit 1
fi
EOF

ENTRYPOINT ["/entrypoint.sh"]
