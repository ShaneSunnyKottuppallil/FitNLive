# Base image
FROM node:20-bullseye-slim

ARG APP_UID=1000
ARG APP_GID=1000
ENV APP_HOME=/usr/src/app

WORKDIR ${APP_HOME}

# install base packages
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

# create user
RUN set -eux; \
    if ! getent group ${APP_GID}; then \
        groupadd -g ${APP_GID} appuser; \
    fi; \
    if ! id -u ${APP_UID} >/dev/null 2>&1; then \
        useradd -u ${APP_UID} -g ${APP_GID} -m -d ${APP_HOME} -s /usr/sbin/nologin appuser; \
    fi
# copy dependency files
COPY backend/package*.json ./

# install dependencies
RUN npm install --omit=dev --silent

# copy backend code
COPY backend/ .

# copy frontend
COPY frontend/ /usr/src/frontend/

# set permissions
RUN chown -R ${APP_UID}:${APP_GID} /usr/src

USER ${APP_UID}

EXPOSE 5000

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["node", "server.js"]