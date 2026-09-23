FROM node:22-alpine AS build
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies cleanly with legacy peer deps fallback
RUN npm install --legacy-peer-deps

# Copy application source files
COPY . .

# Optional Build Arguments for Vite Frontend Environment
ARG VITE_SUPABASE_URL=https://xlwpddwdlcfrokqsfvaa.supabase.co
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsd3BkZHdkbGNmcm9rcXNmdmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDU4MDQsImV4cCI6MjEwNTMyMTgwNH0.Vvw9MOcXllbBQbQvhV33tHfYmS8-gLe9PbQJ7Nh7fjA

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build production static bundle
RUN npm run build

# Serve with lightweight Nginx web server
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Single Page App (SPA) routing configuration
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \\.(?:js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp)$ {\n\
        try_files $uri =404;\n\
        add_header Cache-Control "public, max-age=2592000, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
