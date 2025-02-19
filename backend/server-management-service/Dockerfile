FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3     CMD wget --quiet --tries=1 --spider http://localhost:3004/health || exit 1
EXPOSE 3004

CMD ["npm", "start"]