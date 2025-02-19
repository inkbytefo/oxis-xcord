# Build stage
FROM node:18-alpine AS builder

# Çalışma dizinini ayarla
WORKDIR /usr/src/app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci

# Kaynak kodları kopyala
COPY . .

# TypeScript'i derle
RUN npm run build

# Production stage
FROM node:18-alpine

# Çalışma dizinini ayarla
WORKDIR /usr/src/app

# Package dosyalarını kopyala
COPY package*.json ./

# Sadece production bağımlılıklarını yükle
RUN npm ci --only=production

# Builder aşamasından derlenmiş dosyaları kopyala
COPY --from=builder /usr/src/app/build ./build

# Uygulama için gerekli diğer dosyaları kopyala
COPY .env.example .env

# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Non-root kullanıcı oluştur ve kullan
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Port'u aç
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "build/index.js"]