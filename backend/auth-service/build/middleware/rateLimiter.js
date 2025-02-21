import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
const createRateLimiter = (options) => {
    const { windowMs = 60 * 1000, // Varsayılan 1 dakika
    max = 5, // Varsayılan 5 istek
    message = 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.' } = options;
    return rateLimit({
        store: new RedisStore({
            client: redis,
            prefix: 'rate-limit:'
        }),
        windowMs,
        max,
        statusCode: 429,
        message: {
            status: 429,
            message
        },
        handler: (req, res) => {
            logger.warn(`Rate limit aşıldı: ${req.ip}`);
            res.status(429).json({
                error: true,
                message
            });
        },
        skip: (req) => {
            // Geliştirme ortamında rate limiting'i atla
            return process.env.NODE_ENV === 'development';
        },
        keyGenerator: (req) => {
            // IP adresi ve endpoint'e göre benzersiz anahtar oluştur
            return `${req.ip}:${req.originalUrl}`;
        }
    });
};
export default createRateLimiter;
