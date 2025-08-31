# --- Stage 1: build ---
FROM node:20 AS builder
WORKDIR /app

# Clean and install dependencies
RUN npm cache clean --force
COPY package*.json ./
RUN npm install && npm install -g react-scripts

# Copy all source files
COPY . .

# Build the React app
RUN npm run build

# --- Stage 2: serve ---
FROM nginx:alpine AS production
COPY --from=builder /app/build /usr/share/nginx/html
COPY public/avatars /usr/share/nginx/html/avatars
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
