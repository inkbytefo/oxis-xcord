import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';
dotenv.config();

const dbName = process.env.DB_NAME || 'xcord_db';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: false, // Set to true for debugging
});

export default sequelize;
