# ===== STAGE 1: Build frontend =====
FROM node:20-alpine AS build
WORKDIR /app

# Install npm updates first
RUN npm install -g npm@latest

# Copy manifest and install dependencies (allow rebuild)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build production version
RUN npm run build

# ===== STAGE 2: Serve with Nginx =====
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
