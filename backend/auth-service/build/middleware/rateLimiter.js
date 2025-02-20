"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = __importDefault(require("../config/redis"));
const logger_1 = __importDefault(require("../utils/logger"));
const createRateLimiter = (options) => {
    const { windowMs = 60 * 1000, // Varsayılan 1 dakika
    max = 5, // Varsayılan 5 istek
    message = 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.' } = options;
    return (0, express_rate_limit_1.default)({
        store: new rate_limit_redis_1.default({
            client: redis_1.default,
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
            logger_1.default.warn(`Rate limit aşıldı: ${req.ip}`);
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
exports.default = createRateLimiter;
