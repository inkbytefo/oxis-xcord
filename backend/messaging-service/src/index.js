import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
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

const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/messaging';
mongoose.connect(MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Redis connection
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
redisClient.connect().then(() => logger.info('Connected to Redis'));

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  content: { type: String, required: true },
  room: { type: String, required: false },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New client connected');

  // Join a room
  socket.on('join_room', (room) => {
    socket.join(room);
    logger.info(`Client joined room: ${room}`);
  });

  // Leave a room
  socket.on('leave_room', (room) => {
    socket.leave(room);
    logger.info(`Client left room: ${room}`);
  });

  // Handle new message
  socket.on('send_message', async (data) => {
    try {
      const message = new Message({
        sender: data.sender,
        receiver: data.receiver,
        content: data.content,
        room: data.room
      });

      await message.save();

      if (data.room) {
        io.to(data.room).emit('new_message', message);
      } else {
        io.emit('new_message', message);
      }

      // Store in Redis for quick retrieval
      await redisClient.set(
        `message:${message._id}`,
        JSON.stringify(message),
        { EX: 3600 } // Expire in 1 hour
      );

    } catch (error) {
      logger.error('Error saving message:', error);
      socket.emit('error', { message: 'Error saving message' });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get messages for a room
app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Get direct messages between users
app.get('/api/messages/direct/:sender/:receiver', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.sender, receiver: req.params.receiver },
        { sender: req.params.receiver, receiver: req.params.sender }
      ]
    }).sort({ timestamp: -1 }).limit(50);
    res.json(messages);
  } catch (error) {
    logger.error('Error fetching direct messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
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
  logger.info(`Messaging service running on port ${PORT}`);
});
