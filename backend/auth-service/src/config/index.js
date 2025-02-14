import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auth',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d'
  },
  bcrypt: {
    saltRounds: 10
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }
};
