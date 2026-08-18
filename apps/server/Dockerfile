FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/permissions/package.json packages/permissions/package.json
RUN npm install --workspace=@voxora/server --workspace=@voxora/protocol --workspace=@voxora/permissions
COPY packages ./packages
COPY apps/server ./apps/server
RUN npm run build -w @voxora/protocol && npm run build -w @voxora/permissions && npm run build -w @voxora/server

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=build /app/packages/protocol/package.json ./packages/protocol/package.json
COPY --from=build /app/packages/permissions/dist ./packages/permissions/dist
COPY --from=build /app/packages/permissions/package.json ./packages/permissions/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
EXPOSE 8787
CMD ["node", "apps/server/dist/index.js"]
