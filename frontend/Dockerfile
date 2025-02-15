# Build aşaması
FROM node:20-alpine as build

WORKDIR /app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install

# Kaynak kodları kopyala
COPY . .

# Production build oluştur
RUN npm run build

# Production aşaması
FROM nginx:alpine

# Build çıktısını nginx'e kopyala
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx konfigürasyonunu kopyala
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]