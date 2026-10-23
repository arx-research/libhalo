# HaLo Gateway server image, built from sources.
#
#   docker build -t halo-gateway .
#   docker run --rm -p 32842:32842 halo-gateway
#
# See docs/halo-gateway.md for details.

# Node.js v24.22.1 is the first v24 release with the fixes from the October 2026 Node.js security release.
ARG NODE_VERSION=24.22.1

FROM node:${NODE_VERSION}-trixie-slim AS build

# YARN_ENABLE_SCRIPTS=0: halo-gateway doesn't use any native addons (PC/SC etc.), so skip building them
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    YARN_ENABLE_TELEMETRY=0 \
    YARN_ENABLE_SCRIPTS=0

RUN corepack enable

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY core/package.json core/
COPY cli/package.json cli/
RUN yarn install --immutable

COPY core/ core/
COPY cli/ cli/

# core: tsc produces lib.esm/ which is imported by cli, webpack produces libhalo.js
# and copies it into cli/assets/static/
RUN cd core && yarn tsc && yarn webpack
RUN cd cli && yarn webpack

FROM node:${NODE_VERSION}-trixie-slim

ENV NODE_ENV=production

# The webpack bundle resolves its assets relative to the cli/ directory it was built in (/app/cli),
# so the bundle and assets must keep the same location in this image.
COPY --from=build /app/cli/dist_webpack/entry_gateway.bundle.cjs /app/cli/entry_gateway.bundle.cjs
COPY --from=build /app/cli/assets/ /app/cli/assets/

# The gateway reads ./themes/ and writes ./logs/ relative to the working directory.
# Themes bundled in the repository are included, mount your own directory over /data/themes to replace them.
WORKDIR /data
COPY --chown=node:node cli/themes/ /data/themes/
RUN mkdir -p /data/logs && chown node:node /data /data/logs

USER node

EXPOSE 32842

ENTRYPOINT ["node", "/app/cli/entry_gateway.bundle.cjs", "--listen-host", "0.0.0.0"]
