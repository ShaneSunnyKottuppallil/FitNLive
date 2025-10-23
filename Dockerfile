# Dockerfile (Node LTS)
FROM node:20-bullseye-slim

# create app user (avoid running as root inside container)
RUN useradd --uid 1000 --create-home appuser || true
WORKDIR /usr/src/app

# copy package manifests first for layer caching
COPY package*.json ./
RUN npm ci --production --silent

# copy app
COPY . .

# ensure permissions
RUN chown -R appuser:appuser /usr/src/app

USER appuser
ENV NODE_ENV=production
EXPOSE 5000

# OPTIONAL: if your app exposes a /health endpoint, enable this healthcheck
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD curl -f http://127.0.0.1:5000/health || exit 1

# If your start script is `npm start`, keep this; else replace with `node server.js` etc.
CMD ["npm", "start"]
