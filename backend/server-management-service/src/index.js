import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { config } from './config/index.js';
import sequelize from './config/database.js';

const app = express();

// CORS ayarları
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// JSON body parser
app.use(express.json());

// Route'ları tanımla
app.use('/api', routes);

// Database sync
async function syncDatabase() {
  try {
    await sequelize.sync();
    console.log('Database synced successfully.');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
}

// Temel hata işleyici
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir hata oluştu!' });
});

// Sunucuyu başlat
const port = config.port;
app.listen(port, async () => {
  console.log(`Server Management Service ${port} portunda çalışıyor...`);
  await syncDatabase();
});
