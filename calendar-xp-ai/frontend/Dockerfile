# Build stage
FROM node:18-bullseye-slim AS build

WORKDIR /usr/src/app
COPY web/package.json ./
RUN npm install
COPY web ./
RUN npm run build

# Production stage
FROM nginx:1.25-alpine

COPY --from=build /usr/src/app/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
