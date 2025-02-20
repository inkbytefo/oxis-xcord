"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiterMiddleware = void 0;
const redis_1 = __importDefault(require("redis"));
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const redisClient = redis_1.default.createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    }
});
const rateLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate_limit',
    points: 100, // 100 requests
    duration: 60, // per 60 seconds
    blockDuration: 60 * 5, // block for 5 minutes if exceeded
});
const rateLimiterMiddleware = (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    rateLimiter.consume(clientIp)
        .then(() => {
        next();
    })
        .catch(() => {
        res.status(429).json({ message: 'Too many requests' });
    });
};
exports.rateLimiterMiddleware = rateLimiterMiddleware;
