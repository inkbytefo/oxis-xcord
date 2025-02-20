"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlerMiddleware = void 0;
const errors_1 = require("../utils/errors");
const errorHandlerMiddleware = (err, req, res, next) => {
    const response = {
        message: err.message || 'Internal Server Error',
    };
    // Include validation errors if present
    if (err instanceof errors_1.CustomError && err.errors) {
        response.errors = err.errors;
    }
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }
    // Set appropriate status code
    const statusCode = err instanceof errors_1.CustomError ? err.statusCode : 500;
    res.status(statusCode).json(response);
};
exports.errorHandlerMiddleware = errorHandlerMiddleware;
