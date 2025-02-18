import Redis from 'ioredis';
import { logger } from './logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'messaging:',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

// Room yönetimi için yardımcı fonksiyonlar
export const RoomManager = {
  async addUserToRoom(roomId, userId) {
    try {
      await redis.sadd(`room:${roomId}:users`, userId);
      await redis.sadd(`user:${userId}:rooms`, roomId);
      return true;
    } catch (error) {
      logger.error('Redis addUserToRoom error:', error);
      return false;
    }
  },

  async removeUserFromRoom(roomId, userId) {
    try {
      await redis.srem(`room:${roomId}:users`, userId);
      await redis.srem(`user:${userId}:rooms`, roomId);
      
      // Odada kullanıcı kalmadıysa odayı sil
      const roomUsers = await redis.scard(`room:${roomId}:users`);
      if (roomUsers === 0) {
        await redis.del(`room:${roomId}:users`);
      }
      return true;
    } catch (error) {
      logger.error('Redis removeUserFromRoom error:', error);
      return false;
    }
  },

  async getRoomUsers(roomId) {
    try {
      return await redis.smembers(`room:${roomId}:users`);
    } catch (error) {
      logger.error('Redis getRoomUsers error:', error);
      return [];
    }
  },

  async getUserRooms(userId) {
    try {
      return await redis.smembers(`user:${userId}:rooms`);
    } catch (error) {
      logger.error('Redis getUserRooms error:', error);
      return [];
    }
  },

  async isUserInRoom(roomId, userId) {
    try {
      return await redis.sismember(`room:${roomId}:users`, userId);
    } catch (error) {
      logger.error('Redis isUserInRoom error:', error);
      return false;
    }
  }
};

export default redis;