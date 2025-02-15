FROM node:20-alpine

# MediaSoup ve WebRTC için gerekli paketleri yükle
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    linux-headers \
    git

WORKDIR /app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install --production

# Kaynak kodları kopyala
COPY . .

# Sağlık kontrolü için healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3003/health || exit 1

# WebRTC için gerekli portları aç
EXPOSE 3003
EXPOSE 10000-10100/udp

# Uygulamayı başlat
CMD ["npm", "start"]
