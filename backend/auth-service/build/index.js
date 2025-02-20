"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const passport_1 = __importDefault(require("passport"));
const logger_1 = __importDefault(require("./utils/logger"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const authenticate_1 = require("./middleware/authenticate");
const config_1 = require("./config");
// Express uygulamasını oluştur
const app = (0, express_1.default)();
// Middleware'leri ayarla
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)({
    origin: config_1.config.server.cors.origin,
    methods: config_1.config.server.cors.methods,
    credentials: true
}));
// Passport initialize
app.use(passport_1.default.initialize());
// Sağlık kontrolü endpoint'i
const healthCheckHandler = (_req, res) => {
    res.status(200).json({
        status: 'up',
        timestamp: new Date().toISOString()
    });
};
app.get('/health', healthCheckHandler);
// Metrics endpoint'i
const metricsHandler = (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.status(200).send(`
    # HELP auth_login_attempts_total Toplam giriş denemesi sayısı
    auth_login_attempts_total ${global.loginAttempts || 0}
    # HELP auth_login_failures_total Başarısız giriş denemesi sayısı
    auth_login_failures_total ${global.loginFailures || 0}
    # HELP auth_active_sessions Aktif oturum sayısı
    auth_active_sessions ${global.activeSessions || 0}
  `);
};
app.get('/metrics', metricsHandler);
// Auth route'larını ekle
app.use('/auth', authRoutes_1.default);
// Korumalı route örneği
const protectedHandler = (_req, res) => {
    res.json({ message: 'Bu korumalı bir endpoint' });
};
app.get('/protected', authenticate_1.authenticate, protectedHandler);
// Hata yakalama middleware'i
const errorHandler = (err, _req, res, _next) => {
    logger_1.default.error('Uygulama hatası:', err);
    res.status(500).json({
        error: true,
        message: 'Sunucu hatası'
    });
};
app.use(errorHandler);
// Bulunamayan route'lar için 404
const notFoundHandler = (_req, res) => {
    res.status(404).json({
        error: true,
        message: 'Endpoint bulunamadı'
    });
};
app.use(notFoundHandler);
// PostgreSQL bağlantısını kontrol et
const database_1 = require("./config/database");
const pool = (0, database_1.getPool)();
pool.query('SELECT NOW()', (err) => {
    if (err) {
        logger_1.default.error('PostgreSQL bağlantı hatası:', err);
        process.exit(1);
    }
    logger_1.default.info('PostgreSQL bağlantısı başarılı');
});
// Redis bağlantısını kontrol et
const redis_1 = __importDefault(require("./config/redis"));
redis_1.default.ping((err) => {
    if (err) {
        logger_1.default.error('Redis bağlantı hatası:', err);
        process.exit(1);
    }
    logger_1.default.info('Redis bağlantısı başarılı');
});
// Sunucuyu başlat
const PORT = config_1.config.server.port;
const server = app.listen(PORT, () => {
    logger_1.default.info(`Auth Service ${PORT} portunda çalışıyor`);
    logger_1.default.info(`Ortam: ${process.env.NODE_ENV}`);
});
// Graceful shutdown
const shutdown = () => {
    logger_1.default.info('SIGTERM sinyali alındı. Sunucu kapatılıyor...');
    // Açık bağlantıları kapat
    pool.end();
    redis_1.default.quit();
    // Sunucuyu kapat
    server.close(() => {
        logger_1.default.info('Sunucu kapatıldı');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
exports.default = app;
