# Base image
FROM node:20-bullseye-slim

ARG APP_UID=1000
ARG APP_GID=1000

ENV APP_HOME=/usr/src/app

WORKDIR ${APP_HOME}

# -------------------------------
# Install base packages
# -------------------------------
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

# -------------------------------
# Create non-root user
# -------------------------------
RUN set -eux; \
    if ! getent group ${APP_GID}; then \
        groupadd -g ${APP_GID} appuser; \
    fi; \
    if ! id -u ${APP_UID} >/dev/null 2>&1; then \
        useradd -u ${APP_UID} -g ${APP_GID} -m -d ${APP_HOME} -s /usr/sbin/nologin appuser; \
    fi

# -------------------------------
# Copy dependency files
# -------------------------------
COPY backend/package*.json ./backend/

# Install deps
WORKDIR ${APP_HOME}/backend
RUN npm install --omit=dev --silent

# -------------------------------
# Copy backend
# -------------------------------
COPY backend/ ${APP_HOME}/backend/

# -------------------------------
# Copy frontend (FIXED PATH)
# -------------------------------
COPY frontend/ ${APP_HOME}/frontend/

# 🔥 CRITICAL FIX (your structure issue)
RUN cp -r ${APP_HOME}/frontend/views/* ${APP_HOME}/frontend/

# -------------------------------
# Permissions
# -------------------------------
RUN chown -R ${APP_UID}:${APP_GID} /usr/src

USER ${APP_UID}

EXPOSE 5000

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["node", "backend/server.js"]