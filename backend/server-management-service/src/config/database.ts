import { Pool, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'server_management',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection and retry
const testConnection = async (retries = 5, delay = 5000): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      logger.info('PostgreSQL connection successful');
      return;
    } catch (error) {
      if (i === retries - 1) {
        logger.error('PostgreSQL connection error:', error);
        throw error;
      }
      logger.warn(`PostgreSQL connection failed, retrying in ${delay/1000} seconds`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
) => {
  try {
    return await pool.query<T>(text, params);
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

export const getPool = (): Pool => pool;
export { testConnection };