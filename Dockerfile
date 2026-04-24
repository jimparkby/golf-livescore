# Stage 1: build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: run backend + serve frontend dist
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --production
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./dist
EXPOSE 3001
CMD ["node", "backend/src/index.js"]
