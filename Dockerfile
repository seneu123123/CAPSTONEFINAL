FROM node:22-alpine AS build
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies cleanly with legacy peer deps fallback
RUN npm install --legacy-peer-deps

# Copy application source files
COPY . .

# Build arguments passed from HostForge or environment
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build production static bundle
RUN npm run build

# Serve with lightweight Nginx web server
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Single Page App (SPA) routing and caching configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
