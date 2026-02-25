# DEPS STAGE
FROM node:20-alpine AS dev_deps
WORKDIR /usr/src/app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

# BUILD STAGE
FROM node:20-alpine AS build_deps
WORKDIR /usr/src/app
RUN corepack enable pnpm
COPY --from=dev_deps /usr/src/app/node_modules ./node_modules
COPY tsconfig*.json nest-cli.json package.json ./
COPY src/ ./src/
RUN pnpm run build

# PROD STAGE
FROM node:20-alpine AS prod_deps
WORKDIR /usr/src/app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile --prod
COPY --from=build_deps /usr/src/app/dist ./dist

RUN chown -R node:node /usr/src/app

USER node
CMD ["node", "dist/main.js"]

# DISTROLESS
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS prod_distroless
WORKDIR /usr/src/app

COPY --chown=nonroot:nonroot --from=prod_deps /usr/src/app/node_modules ./node_modules
COPY --chown=nonroot:nonroot --from=build_deps /usr/src/app/dist ./dist

CMD ["dist/main.js"]