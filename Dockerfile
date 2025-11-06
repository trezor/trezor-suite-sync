FROM node:24-alpine as builder

RUN corepack enable
RUN corepack prepare yarn@4.10.3 --activate 

WORKDIR /app

COPY . .

RUN yarn install
RUN yarn build

FROM node:24-alpine

RUN corepack enable
RUN corepack prepare yarn@4.10.3 --activate 

WORKDIR /app

COPY --from=builder /app .

EXPOSE 4000 4001

CMD ["yarn", "start"]
