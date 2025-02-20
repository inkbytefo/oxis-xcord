"use strict";
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
const logger_1 = __importDefault(require("../utils/logger"));
const validate = (validations) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Validasyon kurallarını uygula
            for (const field in validations) {
                const rules = validations[field];
                const value = req.body[field];
                // Alan var mı kontrol et
                if (rules.exists && !value) {
                    return res.status(400).json({
                        error: true,
                        message: `${field} alanı gerekli`,
                        field
                    });
                }
                // Uzunluk kontrolü
                if (rules.isLength) {
                    const { min, max } = rules.isLength;
                    if (min && value.length < min) {
                        return res.status(400).json({
                            error: true,
                            message: `${field} alanı en az ${min} karakter olmalı`,
                            field
                        });
                    }
                    if (max && value.length > max) {
                        return res.status(400).json({
                            error: true,
                            message: `${field} alanı en fazla ${max} karakter olmalı`,
                            field
                        });
                    }
                }
                // Regex kontrolü
                if (rules.matches && !rules.matches.test(value)) {
                    return res.status(400).json({
                        error: true,
                        message: `${field} alanı geçerli formatta değil`,
                        field
                    });
                }
                // Email kontrolü
                if (rules.isEmail && !isValidEmail(value)) {
                    return res.status(400).json({
                        error: true,
                        message: `Geçerli bir email adresi giriniz`,
                        field
                    });
                }
            }
            next();
        }
        catch (error) {
            logger_1.default.error('Validasyon hatası:', error);
            res.status(500).json({
                error: true,
                message: 'Validasyon işlemi sırasında bir hata oluştu'
            });
        }
    });
};
// Email validasyonu için yardımcı fonksiyon
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.default = validate;
