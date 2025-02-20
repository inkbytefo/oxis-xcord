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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.jwt = exports.redis = exports.database = void 0;
const database = __importStar(require("./database"));
exports.database = database;
const redis_1 = __importDefault(require("./redis"));
exports.redis = redis_1.default;
const jwt = __importStar(require("./jwt"));
exports.jwt = jwt;
// Yapılandırma nesnesi
const config = {
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        cors: {
            origin: (process.env.CORS_ORIGIN || 'https://xcord.app').split(','),
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        }
    },
    jwt: {
        accessTokenSecret: process.env.JWT_ACCESS_SECRET,
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
        accessTokenExpiration: '15m',
        refreshTokenExpiration: '7d'
    },
    database: {
        url: process.env.DATABASE_URL,
        pool: {
            min: 2,
            max: 10
        }
    },
    redis: {
        url: process.env.REDIS_URL,
        prefix: 'auth:'
    },
    oauth: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackUrl: process.env.GITHUB_CALLBACK_URL
        }
    }
};
exports.config = config;
