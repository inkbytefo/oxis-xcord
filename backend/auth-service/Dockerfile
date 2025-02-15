FROM node:20-alpine

WORKDIR /app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install --production

# Güvenlik için bcrypt ve crypto modülleri için gerekli paketleri yükle
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Kaynak kodları kopyala
COPY . .

# Sağlık kontrolü için healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3002/health || exit 1

# Auth service portu
EXPOSE 3002

# Uygulamayı başlat
CMD ["npm", "start"]