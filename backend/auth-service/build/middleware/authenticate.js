import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
export const authenticate = (req, res, next) => {
    try {
        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                error: true,
                message: 'Authorization header missing'
            });
        }
        // Extract Bearer token
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: true,
                message: 'Token not found'
            });
        }
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        // Add user info to request object
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger.warn('Expired token access attempt');
            return res.status(401).json({
                error: true,
                message: 'Token expired'
            });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn('Invalid token access attempt');
            return res.status(401).json({
                error: true,
                message: 'Invalid token'
            });
        }
        logger.error('Authentication error:', error);
        res.status(500).json({
            error: true,
            message: 'An error occurred during authentication'
        });
    }
};
// Check for specific user roles
export const authorize = (roles = []) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: true,
                    message: 'Authorization required'
                });
            }
            if (roles.length && !roles.includes(req.user.role || '')) {
                logger.warn(`Unauthorized access attempt - User: ${req.user.id}, Required roles: ${roles.join(', ')}`);
                return res.status(403).json({
                    error: true,
                    message: 'You do not have permission for this action'
                });
            }
            next();
        }
        catch (error) {
            logger.error('Authorization error:', error);
            res.status(500).json({
                error: true,
                message: 'An error occurred during authorization'
            });
        }
    };
};
