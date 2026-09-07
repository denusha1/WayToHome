FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
RUN npm run build -w @waytohome/api
ENV NODE_ENV=production
ENV DEMO_MODE=false
WORKDIR /app/apps/api
EXPOSE 4000
USER node
CMD ["node", "dist/main.js"]
