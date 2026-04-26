FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# ✅ Copy frontend correctly (NOW WORKS because context = root)
COPY frontend/views /usr/share/nginx/html