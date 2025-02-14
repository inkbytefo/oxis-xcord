import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mediasoup from 'mediasoup';
import Redis from 'redis';
import cors from 'cors';
import winston from 'winston';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Redis connection
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
redisClient.connect().then(() => logger.info('Connected to Redis'));

// MediaSoup setup
let mediasoupRouter;

const createMediasoupWorker = async () => {
  const worker = await mediasoup.createWorker({
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });

  worker.on('died', () => {
    logger.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
    setTimeout(() => process.exit(1), 2000);
  });

  const mediaCodecs = [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    }
  ];

  mediasoupRouter = await worker.createRouter({ mediaCodecs });
  logger.info('MediaSoup worker and router created');
};

createMediasoupWorker();

// Room management
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', async (socket) => {
  logger.info('New client connected');

  socket.on('join_room', async (roomName) => {
    try {
      socket.room = roomName;
      socket.join(roomName);

      if (!rooms.has(roomName)) {
        rooms.set(roomName, new Set());
      }
      rooms.get(roomName).add(socket.id);

      // Create WebRTC Transport
      const transport = await mediasoupRouter.createWebRtcTransport({
        listenIps: [{ ip: '127.0.0.1' }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      socket.emit('transport_parameters', {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });

      socket.transport = transport;
      logger.info(`Client joined room: ${roomName}`);
    } catch (error) {
      logger.error('Error in join_room:', error);
      socket.emit('error', { message: 'Error joining room' });
    }
  });

  socket.on('connect_transport', async (dtlsParameters) => {
    try {
      await socket.transport.connect({ dtlsParameters });
      logger.info('Transport connected');
    } catch (error) {
      logger.error('Error in connect_transport:', error);
      socket.emit('error', { message: 'Error connecting transport' });
    }
  });

  socket.on('produce', async (kind, rtpParameters) => {
    try {
      const producer = await socket.transport.produce({ kind, rtpParameters });
      
      producer.on('transportclose', () => {
        producer.close();
      });

      // Notify others in the room
      socket.to(socket.room).emit('new_producer', {
        producerId: producer.id,
        kind: producer.kind,
      });

      socket.emit('producer_created', { id: producer.id });
      logger.info(`New ${kind} producer created`);
    } catch (error) {
      logger.error('Error in produce:', error);
      socket.emit('error', { message: 'Error creating producer' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.room && rooms.has(socket.room)) {
      rooms.get(socket.room).delete(socket.id);
      if (rooms.get(socket.room).size === 0) {
        rooms.delete(socket.room);
      }
    }
    if (socket.transport) {
      socket.transport.close();
    }
    logger.info('Client disconnected');
  });
});

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/rooms', (req, res) => {
  const roomStats = Array.from(rooms.entries()).map(([name, participants]) => ({
    name,
    participantCount: participants.size,
  }));
  res.json(roomStats);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Voice service running on port ${PORT}`);
});
