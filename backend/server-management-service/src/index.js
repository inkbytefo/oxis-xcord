import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { config } from './config/index.js';

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

// Temel hata işleyici
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir hata oluştu!' });
});

// Sunucuyu başlat
const port = config.port;
app.listen(port, () => {
  console.log(`Server Management Service ${port} portunda çalışıyor...`);
});
