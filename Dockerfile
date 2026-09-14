# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_GITSTARS_CLIENT_ID
ENV VITE_GITSTARS_CLIENT_ID=$VITE_GITSTARS_CLIENT_ID

RUN test -n "$VITE_GITSTARS_CLIENT_ID" && pnpm build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /app

COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node docker/server.js ./docker/server.js

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const tls=Boolean(process.env.TLS_CERT_FILE);const client=require(tls?'https':'http');const request=client.get({hostname:'127.0.0.1',port:8080,path:'/healthz',rejectUnauthorized:false},response=>process.exit(response.statusCode===200?0:1));request.on('error',()=>process.exit(1))"

CMD ["node", "docker/server.js"]
