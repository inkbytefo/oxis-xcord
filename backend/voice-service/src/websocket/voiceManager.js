import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import config from '../config';
import { RoomManager } from '../lib/RoomManager';

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

    console.log(`Voice bağlantısı kuruldu: ${user.username}`);

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(socketId, message);
      } catch (error) {
        console.error('Mesaj işleme hatası:', error);
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

  handleMessage(socketId, message) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    const { type, data } = message;
    const { user, socket } = connection;

    switch (type) {
      case 'join-room':
        this.handleJoinRoom(socketId, data.roomId);
        break;
      case 'leave-room':
        this.handleLeaveRoom(socketId, data.roomId);
        break;
      case 'voice-data':
        this.handleVoiceData(socketId, data);
        break;
      case 'mute':
        this.handleMute(socketId, data.roomId, data.isMuted);
        break;
      default:
        console.warn(`Bilinmeyen mesaj tipi: ${type}`);
    }
  }

  handleJoinRoom(socketId, roomId) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

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

  handleVoiceData(socketId, data) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

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
    console.log(`Voice bağlantısı kapandı: ${connection.user.username}`);
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