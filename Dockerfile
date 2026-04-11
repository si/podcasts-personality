# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
# Skip postinstall — frontend already built in stage 1
RUN npm install --omit=dev --ignore-scripts
COPY server.js ./
COPY --from=frontend-builder /app/client/build ./client/build
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
