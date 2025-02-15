import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Redis from 'redis';
import cors from 'cors';
import winston from 'winston';
import { validateMessage, validateRoom } from './middleware/validate.js';
import { messageRateLimiter, httpRateLimiter } from './middleware/rate-limiter.js';
import { MessageEncryption } from './utils/encryption.js';

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
  timestamp: { type: Date, default: Date.now },
  // Encryption fields
  iv: { type: String, required: true },
  encrypted: { type: String, required: true },
  authTag: { type: String, required: true },
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readBy: [{
    userId: String,
    timestamp: Date
  }],
  deliveredTo: [{
    userId: String,
    timestamp: Date
  }]
});

const Message = mongoose.model('Message', messageSchema);

// Authentication middleware for socket connections
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    // Verify token with auth service
    const response = await fetch(`${process.env.AUTH_SERVICE_URL}/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Invalid token');
    }

    const userData = await response.json();
    socket.user = userData;
    next();
  } catch (error) {
    return next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User ${socket.user.id} connected`);

  // Join a room
  socket.on('join_room', async (room) => {
    try {
      await socket.join(room);
      logger.info(`User ${socket.user.id} joined room: ${room}`);
      
      // Mark messages as delivered
      await Message.updateMany(
        { 
          room,
          'deliveredTo.userId': { $ne: socket.user.id }
        },
        {
          $push: {
            deliveredTo: {
              userId: socket.user.id,
              timestamp: new Date()
            }
          },
          $set: { status: 'delivered' }
        }
      );
    } catch (error) {
      logger.error('Error joining room:', error);
      socket.emit('error', { message: 'Error joining room' });
    }
  });

  // Leave a room
  socket.on('leave_room', (room) => {
    socket.leave(room);
    logger.info(`Client left room: ${room}`);
  });

  // Handle new message with rate limiting and encryption
  socket.use(messageRateLimiter);
  
  socket.on('send_message', async (data) => {
    try {
      // Encrypt message
      const encryptedData = MessageEncryption.encryptMessage({
        sender: socket.user.id,
        receiver: data.receiver,
        content: data.content,
        room: data.room
      });

      const message = new Message({
        ...encryptedData,
        sender: socket.user.id,
        receiver: data.receiver,
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

  // Mark message as read
  socket.on('mark_as_read', async (messageId) => {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      // Check if user already marked as read
      if (message.readBy.some(read => read.userId === socket.user.id)) {
        return;
      }

      // Update read status
      await Message.findByIdAndUpdate(messageId, {
        $push: {
          readBy: {
            userId: socket.user.id,
            timestamp: new Date()
          }
        },
        $set: { status: 'read' }
      });

      // Notify other users in room
      if (message.room) {
        socket.to(message.room).emit('message_read', {
          messageId,
          userId: socket.user.id,
          timestamp: new Date()
        });
      } else {
        // For direct messages, notify only the sender
        io.to(message.sender).emit('message_read', {
          messageId,
          userId: socket.user.id,
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('Error marking message as read:', error);
      socket.emit('error', { message: 'Error updating read status' });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    logger.info(`User ${socket.user.id} disconnected`);
  });
});

// Mark messages as read (HTTP endpoint)
app.post('/api/messages/:messageId/read', httpRateLimiter, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user already marked as read
    if (message.readBy.some(read => read.userId === userId)) {
      return res.status(200).json({ status: 'already read' });
    }

    // Update read status
    await Message.findByIdAndUpdate(req.params.messageId, {
      $push: {
        readBy: {
          userId: userId,
          timestamp: new Date()
        }
      },
      $set: { status: 'read' }
    });

    // Notify users via socket
    if (message.room) {
      io.to(message.room).emit('message_read', {
        messageId: req.params.messageId,
        userId: userId,
        timestamp: new Date()
      });
    } else {
      io.to(message.sender).emit('message_read', {
        messageId: req.params.messageId,
        userId: userId,
        timestamp: new Date()
      });
    }

    res.json({ status: 'success' });
  } catch (error) {
    logger.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Error updating read status' });
  }
});

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get messages for a room with pagination
app.get('/api/messages/:room', validateRoom, httpRateLimiter, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ room: req.params.room })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // Decrypt messages
    const decryptedMessages = messages.map(msg => {
      try {
        const decrypted = MessageEncryption.decryptMessage(msg);
        return {
          ...decrypted,
          id: msg._id,
          status: msg.status,
          readBy: msg.readBy,
          deliveredTo: msg.deliveredTo
        };
      } catch (error) {
        logger.error('Message decryption error:', error);
        return null;
      }
    }).filter(Boolean);

    const total = await Message.countDocuments({ room: req.params.room });

    res.json({
      messages: decryptedMessages,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Get direct messages between users with pagination
app.get('/api/messages/direct/:sender/:receiver', httpRateLimiter, async (req, res) => {
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
