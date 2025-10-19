FROM nginx:1.25-alpine

RUN apk add --no-cache openssl curl

COPY docker-entrypoint.d/ /docker-entrypoint.d/

RUN chmod +x /docker-entrypoint.d/*.sh

# Use the default Nginx entrypoint which will execute scripts in /docker-entrypoint.d
CMD ["nginx", "-g", "daemon off;"]
