import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { logger } from '../utils/logger.js';
import { RoomManager } from '../utils/redis.js';

class SocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io'
    });

    this.userSockets = new Map(); // userId -> Set<socketId>
    this.roomSockets = new Map(); // roomId -> Set<userId>
    
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
        next();
      } catch (error) {
        next(new Error('Geçersiz token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Kullanıcı bağlandı: ${socket.user.id}`);
      this.handleConnection(socket);

      socket.on('join-room', (roomId) => this.handleJoinRoom(socket, roomId));
      socket.on('leave-room', (roomId) => this.handleLeaveRoom(socket, roomId));
      socket.on('send-message', (data) => this.handleSendMessage(socket, data));
      socket.on('typing', (data) => this.handleTyping(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  handleConnection(socket) {
    const userId = socket.user.id;
    logger.info(`Kullanıcı bağlandı: ${userId}`);
  }

  async handleJoinRoom(socket, roomId) {
    const userId = socket.user.id;
    try {
      const added = await RoomManager.addUserToRoom(roomId, userId);
      if (!added) {
        logger.error(`Redis'e kullanıcı eklenemedi: ${userId} odaya: ${roomId}`);
        return;
      }
      socket.join(roomId);
      logger.info(`Kullanıcı ${userId} odaya katıldı: ${roomId}`);

      // Odadaki diğer kullanıcılara bildir
      const roomUsers = await RoomManager.getRoomUsers(roomId);
      socket.to(roomId).emit('user-joined', {
        userId: userId,
        username: socket.user.username,
        roomUsers: roomUsers
      });
    } catch (error) {
      logger.error('handleJoinRoom error:', error);
    }
  }

  async handleLeaveRoom(socket, roomId) {
    const userId = socket.user.id;
    try {
      const removed = await RoomManager.removeUserFromRoom(roomId, userId);
      if (!removed) {
        logger.error(`Redis'ten kullanıcı silinemedi: ${userId} odadan: ${roomId}`);
        return;
      }
      socket.leave(roomId);
      logger.info(`Kullanıcı ${userId} odadan ayrıldı: ${roomId}`);

      // Odadaki diğer kullanıcılara bildir
      const roomUsers = await RoomManager.getRoomUsers(roomId);
      socket.to(roomId).emit('user-left', {
        userId: userId,
        username: socket.user.username,
        roomUsers: roomUsers
      });
    } catch (error) {
      logger.error('handleLeaveRoom error:', error);
    }
  }

  handleSendMessage(socket, { roomId, content, type = 'text' }) {
    const userId = socket.user.id;
    RoomManager.isUserInRoom(roomId, userId)
      .then(isInRoom => {
        if (!isInRoom) {
          logger.warn(`Kullanıcı ${userId} odada değil: ${roomId}`);
          return;
        }

        const message = {
          id: Date.now().toString(),
          userId: userId,
          username: socket.user.username,
          content,
          type,
          timestamp: new Date().toISOString()
        };

        // Mesajı odadaki tüm kullanıcılara gönder
        this.io.to(roomId).emit('new-message', message);
      })
      .catch(error => {
        logger.error('isUserInRoom error:', error);
      });
  }

  handleTyping(socket, { roomId, isTyping }) {
    socket.to(roomId).emit('user-typing', {
      userId: socket.user.id,
      username: socket.user.username,
      isTyping
    });
  }

  async handleDisconnect(socket) {
    const userId = socket.user.id;
    logger.info(`Kullanıcı ayrıldı: ${userId}`);

    try {
      const userRooms = await RoomManager.getUserRooms(userId);
      if (userRooms && userRooms.length > 0) {
        for (const roomId of userRooms) {
          await RoomManager.removeUserFromRoom(roomId, userId);
          socket.leave(roomId);
          // Odaya katılan kullanıcılara bildirim gönder
          const roomUsers = await RoomManager.getRoomUsers(roomId);
          socket.to(roomId).emit('user-left', {
            userId: userId,
            username: socket.user.username,
            roomUsers: roomUsers
          });
        }
      }
    } catch (error) {
      logger.error('handleDisconnect error:', error);
    }
  }

  broadcastUserStatus(userId, status) {
    this.io.emit('user-status-change', {
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  // Belirli bir kullanıcıya mesaj gönderme
  sendToUser(userId, event, data) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  // Belirli bir odaya mesaj gönderme
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
}

export default SocketManager;