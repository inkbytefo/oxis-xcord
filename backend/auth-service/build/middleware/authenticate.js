"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
const authenticate = (req, res, next) => {
    try {
        // Authorization header'ını kontrol et
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                error: true,
                message: 'Yetkilendirme başlığı eksik'
            });
        }
        // Bearer token'ı ayıkla
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: true,
                message: 'Token bulunamadı'
            });
        }
        // Token'ı doğrula
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        // Kullanıcı bilgisini request nesnesine ekle
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            logger_1.default.warn('Süresi dolmuş token kullanım denemesi');
            return res.status(401).json({
                error: true,
                message: 'Token süresi dolmuş'
            });
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            logger_1.default.warn('Geçersiz token kullanım denemesi');
            return res.status(401).json({
                error: true,
                message: 'Geçersiz token'
            });
        }
        logger_1.default.error('Kimlik doğrulama hatası:', error);
        res.status(500).json({
            error: true,
            message: 'Kimlik doğrulama işlemi sırasında bir hata oluştu'
        });
    }
};
exports.authenticate = authenticate;
// Belirli rollere sahip kullanıcıları kontrol et
const authorize = (roles = []) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: true,
                    message: 'Yetkilendirme gerekli'
                });
            }
            if (roles.length && !roles.includes(req.user.role || '')) {
                logger_1.default.warn(`Yetkisiz erişim denemesi - Kullanıcı: ${req.user.id}, İstenen rol: ${roles.join(', ')}`);
                return res.status(403).json({
                    error: true,
                    message: 'Bu işlem için yetkiniz yok'
                });
            }
            next();
        }
        catch (error) {
            logger_1.default.error('Yetkilendirme hatası:', error);
            res.status(500).json({
                error: true,
                message: 'Yetkilendirme işlemi sırasında bir hata oluştu'
            });
        }
    };
};
exports.authorize = authorize;
