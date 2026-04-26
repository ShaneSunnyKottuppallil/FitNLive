FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy frontend into nginx
COPY frontend/views /usr/share/nginx/html