import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';

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

        const decoded = jwt.verify(token, config.jwtSecret);
        socket.user = decoded;
        next();
      } catch (error) {
        next(new Error('Geçersiz token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Kullanıcı bağlandı: ${socket.user.id}`);
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
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    // Kullanıcının durumunu çevrimiçi olarak güncelle
    this.broadcastUserStatus(userId, 'online');
  }

  handleJoinRoom(socket, roomId) {
    socket.join(roomId);
    
    if (!this.roomSockets.has(roomId)) {
      this.roomSockets.set(roomId, new Set());
    }
    this.roomSockets.get(roomId).add(socket.user.id);

    // Odadaki diğer kullanıcılara bildir
    socket.to(roomId).emit('user-joined', {
      userId: socket.user.id,
      username: socket.user.username
    });
  }

  handleLeaveRoom(socket, roomId) {
    socket.leave(roomId);
    
    const roomUsers = this.roomSockets.get(roomId);
    if (roomUsers) {
      roomUsers.delete(socket.user.id);
      if (roomUsers.size === 0) {
        this.roomSockets.delete(roomId);
      }
    }

    // Odadaki diğer kullanıcılara bildir
    socket.to(roomId).emit('user-left', {
      userId: socket.user.id,
      username: socket.user.username
    });
  }

  handleSendMessage(socket, { roomId, content, type = 'text' }) {
    const message = {
      id: Date.now().toString(),
      userId: socket.user.id,
      username: socket.user.username,
      content,
      type,
      timestamp: new Date().toISOString()
    };

    // Mesajı odadaki tüm kullanıcılara gönder
    this.io.to(roomId).emit('new-message', message);
  }

  handleTyping(socket, { roomId, isTyping }) {
    socket.to(roomId).emit('user-typing', {
      userId: socket.user.id,
      username: socket.user.username,
      isTyping
    });
  }

  handleDisconnect(socket) {
    const userId = socket.user.id;
    const userSockets = this.userSockets.get(userId);
    
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
        // Kullanıcının durumunu çevrimdışı olarak güncelle
        this.broadcastUserStatus(userId, 'offline');
      }
    }

    // Kullanıcıyı tüm odalardan çıkar
    this.roomSockets.forEach((users, roomId) => {
      if (users.has(userId)) {
        users.delete(userId);
        if (users.size === 0) {
          this.roomSockets.delete(roomId);
        }
      }
    });
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