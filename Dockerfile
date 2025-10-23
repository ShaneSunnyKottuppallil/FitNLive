# --- begin robust user handling (replace fragile useradd/chown lines) ---

# choose an app uid/gid (change if you need a different one)
ARG APP_UID=1000
ARG APP_GID=1000
ENV APP_HOME=/usr/src/app

# create group/user only if they don't already exist; otherwise skip safely.
# Use addgroup/adduser (Debian-based image). If group/user creation fails because
# the UID/GID is already present, we still proceed and use numeric ownership.
RUN set -eux; \
    if ! getent passwd appuser >/dev/null 2>&1; then \
      # create group if missing (ignore errors if GID already exists)
      if ! getent group appuser >/dev/null 2>&1; then \
        addgroup --system --gid ${APP_GID} appuser || true; \
      fi; \
      # create system user if missing (try to reuse existing uid/gid safely)
      adduser --system --uid ${APP_UID} --gid ${APP_GID} --home ${APP_HOME} --no-create-home --shell /usr/sbin/nologin appuser || true; \
    fi; \
    # create app dir and attempt chown by name first, fall back to numeric ids if needed
    mkdir -p ${APP_HOME}; \
    chown -R appuser:appuser ${APP_HOME} 2>/dev/null || chown -R ${APP_UID}:${APP_GID} ${APP_HOME} || true

# switch to the app user if available, otherwise switch by numeric uid
# (USER accepts numeric UID as well)
# prefer named user, else numeric fallback
RUN if id -u appuser >/dev/null 2>&1; then echo "Using appuser"; else echo "Using numeric uid ${APP_UID}"; fi
USER appuser || USER ${APP_UID}

# --- end robust user handling ---
