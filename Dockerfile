# Use the base you were pulling in the logs
FROM node:20-bullseye-slim as base

# metadata / arguments
ARG APP_UID=1000
ARG APP_GID=1000
ENV APP_HOME=/usr/src/app
WORKDIR ${APP_HOME}

# install minimal required packages for user-management (deb-based)
USER root
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates adduser tini; \
    rm -rf /var/lib/apt/lists/*

# Create user/group in a robust way (safe if UID/GID already exists)
RUN set -eux; \
    if ! getent passwd appuser >/dev/null 2>&1; then \
      # create group if missing (ignore errors if GID already exists)
      if ! getent group appuser >/dev/null 2>&1; then \
        addgroup --system --gid ${APP_GID} appuser || true; \
      fi; \
      # create system user if missing (ignore errors)
      adduser --system --uid ${APP_UID} --gid ${APP_GID} --home ${APP_HOME} --no-create-home --shell /usr/sbin/nologin appuser || true; \
    fi; \
    mkdir -p ${APP_HOME}

# copy package manifest first for caching
COPY package*.json ${APP_HOME}/

# install production dependencies
RUN set -eux; \
    npm ci --production --silent

# copy app sources
COPY . ${APP_HOME}/

# ensure ownership - try by name first, fall back to numeric uid/gid
RUN set -eux; \
    chown -R appuser:appuser ${APP_HOME} 2>/dev/null || chown -R ${APP_UID}:${APP_GID} ${APP_HOME} || true

# switch to non-root user
# prefer named user, fallback to numeric UID if USER appuser fails
USER appuser

# expose port (match your compose)
EXPOSE 5000

# use tini as init (optional) and start command - change if your app uses npm start / node index.js
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
