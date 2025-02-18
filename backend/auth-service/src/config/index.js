import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'xcord_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d'
  },
  bcrypt: {
    saltRounds: 10
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
};
