FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy frontend (IMPORTANT: correct path)
COPY ../frontend/views /usr/share/nginx/html