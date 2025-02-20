import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Auth Service Routes
router.use('/auth', createProxyMiddleware({
  target: config.services.auth.url,
  changeOrigin: true,
  pathRewrite: {
    '^/auth': '',
  },
  onError: (err, req, res) => {
    res.status(500).json({ message: 'Auth service unavailable' });
  }
}));

// Message Service Routes
router.use('/messages', authMiddleware, createProxyMiddleware({
  target: config.services.messaging.url,
  changeOrigin: true,
  pathRewrite: {
    '^/messages': '',
  },
  onError: (err, req, res) => {
    res.status(500).json({ message: 'Messaging service unavailable' });
  }
}));

// Voice Service Routes
router.use('/voice', authMiddleware, createProxyMiddleware({
  target: config.services.voice.url,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxy
  pathRewrite: {
    '^/voice': '',
  },
  onError: (err, req, res) => {
    res.status(500).json({ message: 'Voice service unavailable' });
  }
}));

// Server Management Service Routes
router.use('/servers', authMiddleware, createProxyMiddleware({
  target: config.services.serverManagement.url,
  changeOrigin: true,
  pathRewrite: {
    '^/servers': '',
  },
  onError: (err, req, res) => {
    res.status(500).json({ message: 'Server management service unavailable' });
  }
}));

export { router };
