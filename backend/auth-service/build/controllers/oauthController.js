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
exports.githubCallback = exports.githubAuth = exports.googleCallback = exports.googleAuth = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_github2_1 = require("passport-github2");
const jwt_1 = require("../config/jwt");
const db = __importStar(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
// OAuth stratejilerini koşullu olarak yükle
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const googleOptions = {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    };
    passport_1.default.use(new passport_google_oauth20_1.Strategy(googleOptions, (_accessToken, _refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Kullanıcı var mı kontrol et
            const userResult = yield db.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
            if (userResult.rows.length === 0) {
                // Yeni kullanıcı oluştur
                const result = yield db.query('INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *', [profile.displayName, ((_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || '', profile.id]);
                const user = result.rows[0];
                logger_1.default.info(`Yeni Google kullanıcısı oluşturuldu: ${user.username}`);
                return done(null, user);
            }
            const user = userResult.rows[0];
            logger_1.default.info(`Google kullanıcısı giriş yaptı: ${user.username}`);
            return done(null, user);
        }
        catch (error) {
            logger_1.default.error('Google OAuth hatası:', error);
            return done(error, null);
        }
    })));
}
else {
    logger_1.default.warn('Google OAuth kimlik bilgileri eksik. Google ile giriş devre dışı.');
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    const githubOptions = {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL
    };
    passport_1.default.use(new passport_github2_1.Strategy(githubOptions, (_accessToken, _refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Kullanıcı var mı kontrol et
            const userResult = yield db.query('SELECT * FROM users WHERE github_id = $1', [profile.id]);
            if (userResult.rows.length === 0) {
                // Yeni kullanıcı oluştur
                const result = yield db.query('INSERT INTO users (username, github_id) VALUES ($1, $2) RETURNING *', [profile.displayName || profile.id, profile.id]);
                const user = result.rows[0];
                logger_1.default.info(`Yeni GitHub kullanıcısı oluşturuldu: ${user.username}`);
                return done(null, user);
            }
            const user = userResult.rows[0];
            logger_1.default.info(`GitHub kullanıcısı giriş yaptı: ${user.username}`);
            return done(null, user);
        }
        catch (error) {
            logger_1.default.error('GitHub OAuth hatası:', error);
            return done(error, null);
        }
    })));
}
else {
    logger_1.default.warn('GitHub OAuth kimlik bilgileri eksik. GitHub ile giriş devre dışı.');
}
// Google auth başlat
const googleAuth = (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(501).json({ message: 'Google ile giriş şu anda kullanılamıyor' });
    }
    passport_1.default.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
};
exports.googleAuth = googleAuth;
// Google callback
const googleCallback = (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(501).json({ message: 'Google ile giriş şu anda kullanılamıyor' });
    }
    passport_1.default.authenticate('google', { session: false }, (err, user) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            logger_1.default.error('Google callback hatası:', err);
            return res.redirect('/auth/login?error=oauth_failed');
        }
        const accessToken = (0, jwt_1.generateAccessToken)({ id: user.id });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ id: user.id });
        res.redirect(`/auth/success?access_token=${accessToken}&refresh_token=${refreshToken}`);
    }))(req, res, next);
};
exports.googleCallback = googleCallback;
// GitHub auth başlat
const githubAuth = (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        return res.status(501).json({ message: 'GitHub ile giriş şu anda kullanılamıyor' });
    }
    passport_1.default.authenticate('github', {
        scope: ['user:email']
    })(req, res, next);
};
exports.githubAuth = githubAuth;
// GitHub callback
const githubCallback = (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        return res.status(501).json({ message: 'GitHub ile giriş şu anda kullanılamıyor' });
    }
    passport_1.default.authenticate('github', { session: false }, (err, user) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            logger_1.default.error('GitHub callback hatası:', err);
            return res.redirect('/auth/login?error=oauth_failed');
        }
        const accessToken = (0, jwt_1.generateAccessToken)({ id: user.id });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ id: user.id });
        res.redirect(`/auth/success?access_token=${accessToken}&refresh_token=${refreshToken}`);
    }))(req, res, next);
};
exports.githubCallback = githubCallback;
