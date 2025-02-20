"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refreshToken = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db = __importStar(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const jwt_1 = require("../config/jwt");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password } = req.body;
        // Kullanıcı var mı kontrol et
        const userExists = yield db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'Kullanıcı zaten mevcut' });
        }
        // Şifreyi hashle
        const salt = yield bcrypt_1.default.genSalt(10);
        const hashedPassword = yield bcrypt_1.default.hash(password, salt);
        // Kullanıcıyı kaydet
        const result = yield db.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [username, email, hashedPassword]);
        const userId = result.rows[0].id;
        const accessToken = (0, jwt_1.generateAccessToken)({ id: userId });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ id: userId });
        logger_1.default.info(`Yeni kullanıcı kaydedildi: ${username}`);
        res.status(201).json({
            message: 'Kullanıcı başarıyla oluşturuldu',
            accessToken,
            refreshToken
        });
    }
    catch (error) {
        logger_1.default.error('Kayıt işlemi sırasında hata:', error);
        const serviceError = error;
        res.status(serviceError.statusCode || 500).json({ message: 'Sunucu hatası' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Kullanıcıyı bul
        const result = yield db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
        }
        const user = result.rows[0];
        // Şifreyi kontrol et
        const validPassword = yield bcrypt_1.default.compare(password, user.password_hash || '');
        if (!validPassword) {
            return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
        }
        // Token'ları oluştur
        const accessToken = (0, jwt_1.generateAccessToken)({ id: user.id });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ id: user.id });
        // Son giriş zamanını güncelle
        yield db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        logger_1.default.info(`Kullanıcı giriş yaptı: ${user.username}`);
        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    }
    catch (error) {
        logger_1.default.error('Giriş işlemi sırasında hata:', error);
        const serviceError = error;
        res.status(serviceError.statusCode || 500).json({ message: 'Sunucu hatası' });
    }
});
exports.login = login;
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token gerekli' });
        }
        const decoded = (0, jwt_1.generateAccessToken)({ id: refreshToken });
        res.json({ accessToken: decoded });
    }
    catch (error) {
        logger_1.default.error('Token yenileme sırasında hata:', error);
        res.status(401).json({ message: 'Geçersiz refresh token' });
    }
});
exports.refreshToken = refreshToken;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Client tarafında token'ları temizlemek yeterli
        res.json({ message: 'Başarıyla çıkış yapıldı' });
    }
    catch (error) {
        logger_1.default.error('Çıkış işlemi sırasında hata:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});
exports.logout = logout;
