ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM ${NODE_IMAGE} AS production-stage
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build-stage /app/dist ./dist
EXPOSE 9998
CMD ["node", "dist/src/index.js"]
