import express from 'express';
import { circuitBreakers } from '../middleware/circuit-breaker.js';
import { config } from '../config.js';

const router = express.Router();

// Auth Service Routes
router.use('/auth', async (req, res, next) => {
  const breaker = circuitBreakers.auth;
  await breaker.middleware('/api' + req.url)(req, res, next);
});

// Messaging Service Routes
router.use('/messaging', async (req, res, next) => {
  const breaker = circuitBreakers.messaging;
  await breaker.middleware('/api' + req.url)(req, res, next);
});

// Voice Service Routes
router.use('/voice', async (req, res, next) => {
  const breaker = circuitBreakers.voice;
  await breaker.middleware('/api' + req.url)(req, res, next);
});

// Server Management Service Routes
router.use('/server', async (req, res, next) => {
  const breaker = circuitBreakers.serverManagement;
  await breaker.middleware('/api' + req.url)(req, res, next);
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      auth: circuitBreakers.auth.getBreaker('/health').stats,
      messaging: circuitBreakers.messaging.getBreaker('/health').stats,
      voice: circuitBreakers.voice.getBreaker('/health').stats,
      serverManagement: circuitBreakers.serverManagement.getBreaker('/health').stats
    },
    timestamp: new Date().toISOString()
  });
});

// Service discovery endpoint
router.get('/services', (req, res) => {
  res.json({
    services: {
      auth: {
        url: config.services.auth,
        status: 'active'
      },
      messaging: {
        url: config.services.messaging,
        status: 'active'
      },
      voice: {
        url: config.services.voice,
        status: 'active'
      },
      serverManagement: {
        url: config.services.serverManagement,
        status: 'active'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
