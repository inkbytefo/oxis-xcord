import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3004,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  environment: process.env.NODE_ENV || 'development',
};
