import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';
dotenv.config();

const dbName = process.env.DB_NAME || 'xcord_db';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: false, // Set to true for debugging
});

export const config = {
  port: process.env.PORT || 3004, // Port güncellendi: 3004
  corsOrigin: process.env.CORS_ORIGIN || '*',
  environment: process.env.NODE_ENV || 'development',
};
