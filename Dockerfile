# Estágio 1: Construir o aplicativo Angular
FROM node:20 AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build -- --configuration production

# Estágio 2: Servir o aplicativo com Nginx
FROM nginx:alpine

# Copiar os artefatos de compilação do estágio de compilação
COPY --from=build /app/dist/monPonte/browser /usr/share/nginx/html

# Expor a porta 80
EXPOSE 80
