import express from 'express';
import { serverController } from '../controllers/serverController.js';
import { channelController } from '../controllers/channelController.js';
import { rateLimiter } from '../middleware/rate-limiter.js';

const router = express.Router();

router.use(rateLimiter);

// Sunucu route'ları
router.post('/servers', serverController.createServer);
router.get('/servers', serverController.listServers);
router.get('/servers/:serverId', serverController.getServer);
router.put('/servers/:serverId', serverController.updateServer);
router.delete('/servers/:serverId', serverController.deleteServer);
router.post('/servers/:serverId/members', serverController.addMember);
router.delete('/servers/:serverId/members', serverController.removeMember);

// Kanal route'ları
router.post('/servers/:serverId/channels', channelController.createChannel);
router.get('/servers/:serverId/channels', channelController.listChannels);
router.get('/servers/:serverId/channels/:channelId', channelController.getChannel);
router.put('/servers/:serverId/channels/:channelId', channelController.updateChannel);
router.delete('/servers/:serverId/channels/:channelId', channelController.deleteChannel);

export default router;
