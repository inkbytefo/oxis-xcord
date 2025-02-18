import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { RoomManager } from '../lib/RoomManager.js';
import { roomJoinRateLimiter, signalRateLimiter } from '../middleware/rate-limiter.js';

class VoiceManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/voice'
    });

    this.rooms = new RoomManager();
    this.connections = new Map(); // socketId -> {socket, user}
    
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', async (socket, request) => {
      try {
        const user = await this.authenticateConnection(request);
        this.handleConnection(socket, user);
      } catch (error) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Kimlik doğrulama başarısız'
        }));
        socket.close();
      }
    });
  }

  async authenticateConnection(request) {
    const token = this.extractToken(request);
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new Error('Geçersiz token');
    }
  }

  extractToken(request) {
    const auth = request.headers['authorization'];
    return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  }

  handleConnection(socket, user) {
    const socketId = this.generateSocketId();
    this.connections.set(socketId, { socket, user });

    logger.info(`Voice bağlantısı kuruldu: ${user.username}`);

    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await this.handleMessage(socketId, message);
      } catch (error) {
        logger.error('Mesaj işleme hatası:', error);
      }
    });

    socket.on('close', () => {
      this.handleDisconnect(socketId);
    });

    // Başarılı bağlantı bilgisini gönder
    socket.send(JSON.stringify({
      type: 'connected',
      data: {
        socketId,
        user: {
          id: user.id,
          username: user.username
        }
      }
    }));
  }

  async handleMessage(socketId, message) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    const { type, data } = message;
    const { user, socket } = connection;

    try {
      switch (type) {
        case 'join-room':
          await this.handleJoinRoom(socketId, data.roomId);
          break;
        case 'leave-room':
          await this.handleLeaveRoom(socketId, data.roomId);
          break;
        case 'voice-data':
          await this.handleVoiceData(socketId, data);
          break;
        case 'mute':
          this.handleMute(socketId, data.roomId, data.isMuted);
          break;
        default:
          console.warn(`Bilinmeyen mesaj tipi: ${type}`);
      }
    } catch (error) {
      logger.error('Mesaj işleme hatası:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  async handleJoinRoom(socketId, roomId) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    try {
      await roomJoinRateLimiter(connection.socket);
      const room = this.rooms.getOrCreateRoom(roomId);
      room.addParticipant(connection.user.id, socketId);

      // Odadaki diğer kullanıcıları bilgilendir
      this.broadcastToRoom(roomId, {
        type: 'user-joined',
        data: {
          userId: connection.user.id,
          username: connection.user.username
        }
      }, [socketId]);

      // Yeni kullanıcıya mevcut katılımcıları gönder
      const participants = room.getParticipants().map(p => ({
        userId: p.userId,
        username: this.getUserById(p.userId)?.username,
        isMuted: p.isMuted
      }));

      connection.socket.send(JSON.stringify({
        type: 'room-info',
        data: {
          roomId,
          participants
        }
      }));
    } catch (error) {
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  handleLeaveRoom(socketId, roomId) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    const room = this.rooms.getRoom(roomId);
    if (!room) return;

    room.removeParticipant(connection.user.id);
    
    // Odadaki diğer kullanıcıları bilgilendir
    this.broadcastToRoom(roomId, {
      type: 'user-left',
      data: {
        userId: connection.user.id,
        username: connection.user.username
      }
    });

    // Oda boşsa temizle
    if (room.isEmpty()) {
      this.rooms.removeRoom(roomId);
    }
  }

  async handleVoiceData(socketId, data) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    try {
      await signalRateLimiter(connection.socket);

      const room = this.rooms.getRoomByUserId(connection.user.id);
      if (!room) return;

      // Ses verisini odadaki diğer kullanıcılara ilet
      this.broadcastToRoom(room.id, {
        type: 'voice-data',
        data: {
          userId: connection.user.id,
          username: connection.user.username,
          voiceData: data.voiceData
        }
      }, [socketId]);
    } catch (error) {
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  handleMute(socketId, roomId, isMuted) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    const room = this.rooms.getRoom(roomId);
    if (!room) return;

    room.updateParticipant(connection.user.id, { isMuted });

    // Odadaki diğer kullanıcıları bilgilendir
    this.broadcastToRoom(roomId, {
      type: 'user-mute-change',
      data: {
        userId: connection.user.id,
        username: connection.user.username,
        isMuted
      }
    });
  }

  handleDisconnect(socketId) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    // Kullanıcıyı tüm odalardan çıkar
    this.rooms.getAllRooms().forEach(room => {
      if (room.hasParticipant(connection.user.id)) {
        this.handleLeaveRoom(socketId, room.id);
      }
    });

    this.connections.delete(socketId);
    logger.info(`Voice bağlantısı kapandı: ${connection.user.username}`);
  }

  broadcastToRoom(roomId, message, excludeSocketIds = []) {
    const room = this.rooms.getRoom(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    room.getParticipants().forEach(participant => {
      if (!excludeSocketIds.includes(participant.socketId)) {
        const connection = this.connections.get(participant.socketId);
        if (connection?.socket.readyState === WebSocket.OPEN) {
          connection.socket.send(messageStr);
        }
      }
    });
  }

  getUserById(userId) {
    for (const [_, connection] of this.connections) {
      if (connection.user.id === userId) {
        return connection.user;
      }
    }
    return null;
  }

  generateSocketId() {
    return `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default VoiceManager;
