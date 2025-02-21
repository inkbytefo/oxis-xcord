import mediasoup from 'mediasoup';
import { config } from '../config.js';
import { Room } from './Room.js';
import logger from '../utils/logger.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
    this.workers = new Set(); // Set of mediasoup workers
    this.nextWorkerIndex = 0;
  }

  async init() {
    const { numWorkers = 4 } = config.mediasoup.worker;
    
    logger.info(`Creating ${numWorkers} mediasoup workers...`);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort
      });

      worker.on('died', () => {
        logger.error(`Worker ${worker.pid} died, exiting in 2 seconds...`);
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.add(worker);
    }

    logger.info('Mediasoup workers ready');
  }

  async getOrCreateRoom(roomId) {
    let room = this.rooms.get(roomId);
    
    if (!room) {
      const worker = this.getNextWorker();
      room = new Room(roomId, worker);
      await room.init();
      this.rooms.set(roomId, room);
      logger.info(`Created new room: ${roomId}`);
    }
    
    return room;
  }

  getNextWorker() {
    const workers = Array.from(this.workers);
    const worker = workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % workers.length;
    return worker;
  }

  async closeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    await room.close();
    this.rooms.delete(roomId);
    logger.info(`Closed room: ${roomId}`);
  }

  getRoomIds() {
    return Array.from(this.rooms.keys());
  }

  async close() {
    logger.info('Closing all rooms and workers...');
    
    for (const room of this.rooms.values()) {
      await room.close();
    }
    
    this.rooms.clear();

    for (const worker of this.workers) {
      await worker.close();
    }
    
    this.workers.clear();
  }
}
