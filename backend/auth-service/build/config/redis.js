"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL);
// Redis bağlantı durumunu kontrol et
redis.on('connect', () => {
    console.info('Redis bağlantısı başarılı');
});
redis.on('error', (error) => {
    console.error('Redis bağlantı hatası:', error);
});
exports.default = redis;
