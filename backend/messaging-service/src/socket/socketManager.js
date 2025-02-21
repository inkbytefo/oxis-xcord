import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';
import config from '../config.js';
import { logger } from '../utils/logger.js';
import { getRedisConnection } from '../utils/redis.js';

const redis = getRedisConnection();

class SocketManager extends EventEmitter {
  constructor(server) {
    super();
    this.io = new Server(server, {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io'
    });

    // Weak referanslar kullanarak bellek sızıntısını önle
    this.userSockets = new WeakMap();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Kimlik doğrulama gerekli'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;

        // Kullanıcının aktif oturumlarını kontrol et
        const activeSessions = await this.getUserActiveSessions(decoded.id);
        if (!activeSessions.includes(socket.handshake.auth.sessionId)) {
          return next(new Error('Geçersiz oturum'));
        }

        next();
      } catch (error) {
        logger.error('Socket auth hatası:', error);
        next(new Error('Kimlik doğrulama başarısız'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.emit('connection');
      
      socket.on('disconnect', () => {
        this.emit('disconnect');
      });
    });
  }
  async handleConnection(socket) {
    const userId = socket.user.id;
    try {
      await this.addUserSocket(userId, socket.id);
      logger.info(`Kullanıcı bağlandı: ${userId}`);
    } catch (error) {
      logger.error('Bağlantı hatası:', error);
      socket.disconnect(true);
    }
  }

  async handleJoinRoom(socket, roomId) {
    const userId = socket.user.id;
    const multi = redis.multi();

    try {
      // Atomic işlemlerle oda yönetimi
      multi.sadd(`room:${roomId}:users`, userId);
      multi.sadd(`user:${userId}:rooms`, roomId);
      const results = await multi.exec();

      if (!results || results.some(result => !result[1])) {
        throw new Error('Oda işlemi başarısız');
      }

      await socket.join(roomId);
      logger.info(`Kullanıcı ${userId} odaya katıldı: ${roomId}`);

      const roomUsers = await this.getRoomUsers(roomId);
      this.io.to(roomId).emit('user-joined', {
        userId,
        username: socket.user.username,
        roomUsers
      });

    } catch (error) {
      logger.error('handleJoinRoom hatası:', error);
      socket.emit('error', { message: 'Odaya katılma başarısız' });
    }
  }

  async handleLeaveRoom(socket, roomId) {
    const userId = socket.user.id;
    const multi = redis.multi();

    try {
      // Atomic işlemlerle oda çıkışı
      multi.srem(`room:${roomId}:users`, userId);
      multi.srem(`user:${userId}:rooms`, roomId);
      const results = await multi.exec();

      if (!results || results.some(result => !result[1])) {
        throw new Error('Oda çıkış işlemi başarısız');
      }

      await socket.leave(roomId);
      logger.info(`Kullanıcı ${userId} odadan ayrıldı: ${roomId}`);

      const roomUsers = await this.getRoomUsers(roomId);
      this.io.to(roomId).emit('user-left', {
        userId,
        username: socket.user.username,
        roomUsers
      });

    } catch (error) {
      logger.error('handleLeaveRoom hatası:', error);
      socket.emit('error', { message: 'Odadan çıkış başarısız' });
    }
  }

  async handleSendMessage(socket, { roomId, content, type = 'text' }) {
    const userId = socket.user.id;
    
    try {
      // Atomic işlemle oda üyeliği kontrolü
      const isMember = await redis.sismember(`room:${roomId}:users`, userId);
      if (!isMember) {
        throw new Error('Kullanıcı odada değil');
      }

      const message = {
        id: Date.now().toString(),
        userId,
        username: socket.user.username,
        content,
        type,
        timestamp: new Date().toISOString()
      };

      // Mesaj geçmişini sakla
      await redis.lpush(`room:${roomId}:messages`, JSON.stringify(message));
      await redis.ltrim(`room:${roomId}:messages`, 0, 99); // Son 100 mesajı tut

      this.io.to(roomId).emit('new-message', message);

    } catch (error) {
      logger.error('handleSendMessage hatası:', error);
      socket.emit('error', { message: 'Mesaj gönderme başarısız' });
    }
  }

  handleTyping(socket, { roomId, isTyping }) {
    const userId = socket.user.id;
    
    redis.sismember(`room:${roomId}:users`, userId)
      .then(isMember => {
        if (isMember) {
          socket.to(roomId).emit('user-typing', {
            userId,
            username: socket.user.username,
            isTyping
          });
        }
      })
      .catch(error => {
        logger.error('handleTyping hatası:', error);
      });
  }

  async handleDisconnect(socket) {
    const userId = socket.user?.id;
    if (!userId) return;

    try {
      // Kullanıcının tüm odalardan çıkışını sağla
      const userRooms = await redis.smembers(`user:${userId}:rooms`);
      const multi = redis.multi();

      for (const roomId of userRooms) {
        multi.srem(`room:${roomId}:users`, userId);
        multi.srem(`user:${userId}:rooms`, roomId);
        
        this.io.to(roomId).emit('user-left', {
          userId,
          username: socket.user.username
        });
      }

      await multi.exec();
      await this.removeUserSocket(userId, socket.id);
      logger.info(`Kullanıcı ayrıldı: ${userId}`);

    } catch (error) {
      logger.error('handleDisconnect hatası:', error);
    }
  }

  // Yardımcı metodlar
  async addUserSocket(userId, socketId) {
    await redis.sadd(`user:${userId}:sockets`, socketId);
  }

  async removeUserSocket(userId, socketId) {
    await redis.srem(`user:${userId}:sockets`, socketId);
  }

  async getUserActiveSessions(userId) {
    return await redis.smembers(`user:${userId}:sessions`);
  }

  async getRoomUsers(roomId) {
    return await redis.smembers(`room:${roomId}:users`);
  }

  // Belirli bir kullanıcıya mesaj gönderme
  async sendToUser(userId, event, data) {
    const socketIds = await redis.smembers(`user:${userId}:sockets`);
    socketIds.forEach(socketId => {
      this.io.to(socketId).emit(event, data);
    });
  }

  // Belirli bir odaya mesaj gönderme
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
}

export default SocketManager;