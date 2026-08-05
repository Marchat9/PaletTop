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

# Bakes the backend API URL into the production build. Override at build time for your own
# deployment, e.g.: docker build --target production --build-arg API_BASE_URL=https://api.example.com .
ARG API_BASE_URL=http://localhost:3000
RUN sed -i "s#backBaseApiUrl: environmentBase.backBaseApiUrl,#backBaseApiUrl: '${API_BASE_URL}',#" \
    src/environments/environment.prod.ts

RUN npm run build

# ---- production: Nginx serving the static build ----
FROM nginx:alpine AS production

COPY --from=build /app/dist/PaletTop/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
