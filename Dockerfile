# Stage 1: Build the Angular application
FROM node:20 AS build

# Set the working directory
WORKDIR /app

# Copy package configuration files and install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy the rest of the frontend application code
COPY frontend/ ./

# Build the application for production
RUN npm run build -- --configuration production

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build artifacts from the build stage to the Nginx server directory
COPY --from=build /app/dist/monPonte/browser /usr/share/nginx/html

# Expose port 80 to allow traffic to the Nginx server
EXPOSE 80

# Command to start the Nginx server in the foreground
CMD ["nginx", "-g", "daemon off;"]
