import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config.js';
import { RoomManager } from './lib/RoomManager.js';
import { logger } from './utils/logger.js';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const roomManager = new RoomManager();

const PORT = process.env.PORT || 3003;

async function handleConnection(socket) {
  logger.info('New connection', { socketId: socket.id });

  socket.on('joinRoom', async ({ roomId, rtpCapabilities }) => {
    try {
      const room = await roomManager.getOrCreateRoom(roomId);
      
      // Add peer to room
      room.addPeer(socket.id, {
        id: socket.id,
        rtpCapabilities
      });

      socket.join(roomId);
      
      // Notify others in room
      socket.to(roomId).emit('peerJoined', {
        peerId: socket.id,
        rtpCapabilities
      });

      // Send router RTP capabilities
      socket.emit('routerCapabilities', {
        routerRtpCapabilities: room.router.rtpCapabilities
      });

      logger.info('Peer joined room', {
        socketId: socket.id,
        roomId,
        peersInRoom: room.getPeers().length
      });
    } catch (error) {
      logger.error('Error joining room', { error, socketId: socket.id, roomId });
      socket.emit('error', { message: 'Could not join room' });
    }
  });

  socket.on('createWebRtcTransport', async ({ roomId, consuming }) => {
    try {
      const room = await roomManager.getOrCreateRoom(roomId);
      const transport = await room.createWebRtcTransport(socket);

      socket.emit('webRtcTransportCreated', {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });

      logger.info('WebRTC transport created', {
        socketId: socket.id,
        transportId: transport.id,
        consuming
      });
    } catch (error) {
      logger.error('Error creating WebRTC transport', { error, socketId: socket.id });
      socket.emit('error', { message: 'Could not create WebRTC transport' });
    }
  });

  socket.on('connectTransport', async ({ roomId, transportId, dtlsParameters }) => {
    try {
      const room = await roomManager.getOrCreateRoom(roomId);
      await room.connectTransport(transportId, dtlsParameters);
      
      socket.emit('transportConnected');
      
      logger.info('Transport connected', { socketId: socket.id, transportId });
    } catch (error) {
      logger.error('Error connecting transport', { error, socketId: socket.id, transportId });
      socket.emit('error', { message: 'Could not connect transport' });
    }
  });

  socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, appData }) => {
    try {
      const room = await roomManager.getOrCreateRoom(roomId);
      const producer = await room.produce(transportId, kind, rtpParameters, appData);

      socket.emit('produced', { id: producer.id });

      // Notify other peers in the room
      socket.to(roomId).emit('newProducer', {
        peerId: socket.id,
        producerId: producer.id,
        kind,
        rtpParameters
      });

      logger.info('New producer', {
        socketId: socket.id,
        producerId: producer.id,
        kind
      });
    } catch (error) {
      logger.error('Error producing', { error, socketId: socket.id });
      socket.emit('error', { message: 'Could not create producer' });
    }
  });

  socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }) => {
    try {
      const room = await roomManager.getOrCreateRoom(roomId);
      const consumer = await room.consume(transportId, producerId, rtpCapabilities);

      socket.emit('consumed', {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused
      });

      logger.info('New consumer', {
        socketId: socket.id,
        consumerId: consumer.id,
        producerId
      });
    } catch (error) {
      logger.error('Error consuming', { error, socketId: socket.id });
      socket.emit('error', { message: 'Could not create consumer' });
    }
  });

  socket.on('resumeConsumer', async ({ roomId, consumerId }) => {
    try {
      const room = await roomManager.getOrCreateRoom(roomId);
      const consumer = room.consumers.get(consumerId);
      if (consumer) {
        await consumer.resume();
        socket.emit('consumerResumed', { consumerId });
      }
    } catch (error) {
      logger.error('Error resuming consumer', { error, socketId: socket.id, consumerId });
      socket.emit('error', { message: 'Could not resume consumer' });
    }
  });

  socket.on('disconnect', async () => {
    logger.info('Peer disconnected', { socketId: socket.id });
    
    // Clean up peer from all rooms
    for (const roomId of roomManager.getRoomIds()) {
      const room = await roomManager.getOrCreateRoom(roomId);
      if (room.peers.has(socket.id)) {
        await room.handlePeerLeave(socket.id);
        socket.to(roomId).emit('peerLeft', { peerId: socket.id });
        
        // Close empty rooms
        if (room.peers.size === 0) {
          await roomManager.closeRoom(roomId);
        }
      }
    }
  });
}

async function main() {
  try {
    await roomManager.init();
    io.on('connection', handleConnection);

    server.listen(PORT, () => {
      logger.info(`Voice service listening on port ${PORT}`);
    });

    // Graceful shutdown
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, async () => {
        logger.info('Shutting down voice service...');
        await roomManager.close();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start voice service', { error });
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Unhandled error in main', { error });
  process.exit(1);
});
