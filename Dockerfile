# =============================================================================
# On It — Dockerfile del backend (multi-stage)
# -----------------------------------------------------------------------------
# Imagen liviana basada en node:20-slim. Se construye en etapas para que la
# imagen final no cargue con herramientas de build innecesarias.
# =============================================================================

# ---- base: Node + openssl (lo necesita Prisma) ----
FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- deps: instala dependencias con el lockfile (reproducible) ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/connectors/package.json packages/connectors/package.json
RUN npm ci

# ---- build: copia el código y genera el cliente de Prisma ----
FROM deps AS build
COPY . .
RUN npm run prisma:generate --workspace @on-it/backend

# ---- runtime: la imagen que efectivamente corre en producción ----
FROM build AS runtime
ENV NODE_ENV=production
EXPOSE 3000
# Aplica el esquema a la base y levanta el servidor.
# En producción con migraciones versionadas, cambiar db push por "migrate deploy".
CMD ["sh", "-c", "npm run prisma:push --workspace @on-it/backend && npx tsx apps/backend/src/index.ts"]
