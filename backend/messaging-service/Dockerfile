FROM node:20-alpine

WORKDIR /app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install --production

# Kaynak kodları kopyala
COPY . .

# Sağlık kontrolü için healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

EXPOSE 3000

# Uygulamayı başlat
CMD ["npm", "start"]