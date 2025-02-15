import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyToken } from '../middleware/auth.js';
import config from '../config.js';

const router = express.Router();

// Auth Service routes - Public endpoints
router.use(config.SERVICES.AUTH.PREFIX, createProxyMiddleware({
  target: config.SERVICES.AUTH.URL,
  changeOrigin: true,
  pathRewrite: {
    [`^${config.SERVICES.AUTH.PREFIX}`]: '',
  },
}));

// Messaging Service routes - Protected endpoints
router.use(config.SERVICES.MESSAGING.PREFIX, 
  verifyToken,
  createProxyMiddleware({
    target: config.SERVICES.MESSAGING.URL,
    changeOrigin: true,
    pathRewrite: {
      [`^${config.SERVICES.MESSAGING.PREFIX}`]: '',
    },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
    }
  })
);

// Voice Service routes - Protected endpoints
router.use(config.SERVICES.VOICE.PREFIX,
  verifyToken,
  createProxyMiddleware({
    target: config.SERVICES.VOICE.URL,
    changeOrigin: true,
    pathRewrite: {
      [`^${config.SERVICES.VOICE.PREFIX}`]: '',
    },
    ws: true, // WebSocket desteği
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
    }
  })
);

// Server Management Service routes - Protected endpoints
router.use(config.SERVICES.SERVER_MANAGEMENT.PREFIX,
  verifyToken,
  createProxyMiddleware({
    target: config.SERVICES.SERVER_MANAGEMENT.URL,
    changeOrigin: true,
    pathRewrite: {
      [`^${config.SERVICES.SERVER_MANAGEMENT.PREFIX}`]: '',
    },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
    }
  })
);

export default router;
