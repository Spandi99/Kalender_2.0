# ===== STAGE 1: Build frontend =====
FROM node:20-alpine AS build
WORKDIR /app

# Install npm updates first
RUN npm install -g npm@latest

# Copy manifest and install dependencies (allow rebuild)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Ensure critical FullCalendar modules are always present
RUN npm install --legacy-peer-deps \
    @fullcalendar/core@6.1.11 \
    @fullcalendar/daygrid@6.1.11 \
    @fullcalendar/timegrid@6.1.11 \
    @fullcalendar/list@6.1.11 \
    @fullcalendar/react@6.1.11 \
    @fullcalendar/interaction@6.1.11

# Copy source files
COPY . .

# Build production version
# Ensure placeholder CSS exists before bundling
RUN node scripts/prebuild.js

RUN npm run build

# ===== STAGE 2: Serve with Nginx =====
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
