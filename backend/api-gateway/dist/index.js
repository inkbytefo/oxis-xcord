"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const _config_1 = require("@config");
const auth_1 = require("@middleware/auth");
const rate_limiter_1 = require("@middleware/rate-limiter");
const error_handler_1 = require("@middleware/error-handler");
const validation_1 = require("@middleware/validation");
const routes_1 = require("./routes");
const app = (0, express_1.default)();
// Security headers
app.disable('x-powered-by');
app.use(express_1.default.json({ limit: '10kb' }));
// Middleware
app.use(rate_limiter_1.rateLimiterMiddleware);
app.use(auth_1.authMiddleware);
app.use(validation_1.validateRequest);
// Routes
app.use(routes_1.router);
// Error handling
app.use(error_handler_1.errorHandlerMiddleware);
app.listen(_config_1.config.port, () => {
    console.log(`API Gateway listening on port ${_config_1.config.port}`);
});
