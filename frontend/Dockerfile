# ---- dev: used by docker-compose for local development (source is bind-mounted over this) ----
FROM node:22-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200"]

# ---- build: compiles the Angular app to a static bundle ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# App version baked into the bundle at build time (see scripts/set-version.mjs, run
# automatically via the `prebuild` npm lifecycle script). Set from the release tag by
# .github/workflows/docker-images.yml; defaults to the committed placeholder otherwise.
ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION

RUN npm run build

# ---- production: Nginx serving the static build ----
FROM nginx:alpine AS production

COPY --from=build /app/dist/PaletTop/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Backend URL is resolved at container startup, not baked into the build — see
# docker-entrypoint.d/20-envsubst-runtime-config.sh and src/assets/env.js.
# Override with: docker run -e API_BASE_URL=https://api.example.com ...
COPY docker-entrypoint.d/20-envsubst-runtime-config.sh /docker-entrypoint.d/20-envsubst-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/20-envsubst-runtime-config.sh

EXPOSE 80
