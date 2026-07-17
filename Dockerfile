FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY scripts/start-with-migrate.sh ./scripts/start-with-migrate.sh
RUN chmod +x ./scripts/start-with-migrate.sh
USER node
EXPOSE 8080
# Railway injects PORT; fall back to 8080 for local/docker runs.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "const p=process.env.PORT||8080; require('node:http').get('http://127.0.0.1:'+p+'/health/live', (r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["./scripts/start-with-migrate.sh"]
