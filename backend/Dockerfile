# ---- dev: used by docker-compose for local development (source is bind-mounted over this) ----
FROM node:22-alpine AS dev

WORKDIR /app
# Time zones for the TZ variable set by docker compose (Europe/Paris by default): it drives the
# logs and the scheduled jobs, whose cron expressions are read in this zone.
RUN apk add --no-cache tzdata

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# ---- build: compiles TypeScript to dist/ ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- production: slim runtime, no devDependencies, no TypeScript source ----
FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
# Time zones for the TZ variable set by docker compose (Europe/Paris by default): it drives the
# logs and the scheduled jobs, whose cron expressions are read in this zone.
RUN apk add --no-cache tzdata
# Release tag the image was built from (CI build arg), served by GET /version: the frontend
# compares it with its own version to detect a stale cached app.
ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Use non-root "node" USER, already provided in "node:22-alpine" image
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]