import { Pool, QueryResult, QueryResultRow } from 'pg';
import logger from '../utils/logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Bağlantıyı test et ve yeniden dene
const testConnection = async (retries = 5, delay = 5000): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      logger.info('PostgreSQL bağlantısı başarılı');
      return;
    } catch (error) {
      if (i === retries - 1) {
        logger.error('PostgreSQL bağlantı hatası:', error);
        throw error;
      }
      logger.warn(`PostgreSQL bağlantısı başarısız, ${delay/1000} saniye sonra tekrar denenecek`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  try {
    return await pool.query<T>(text, params);
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

export const getPool = (): Pool => pool;
export { testConnection };