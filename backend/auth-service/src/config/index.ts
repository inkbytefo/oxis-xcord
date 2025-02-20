import * as database from './database';
import redis from './redis';
import * as jwt from './jwt';
import { Config } from '../types';

// Yapılandırma nesnesi
const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    cors: {
      origin: (process.env.CORS_ORIGIN || 'https://xcord.app').split(','),
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  },
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
    accessTokenExpiration: '15m',
    refreshTokenExpiration: '7d'
  },
  database: {
    url: process.env.DATABASE_URL!,
    pool: {
      min: 2,
      max: 10
    }
  },
  redis: {
    url: process.env.REDIS_URL!,
    prefix: 'auth:'
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL!
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackUrl: process.env.GITHUB_CALLBACK_URL!
    }
  }
};

export { database, redis, jwt, config };