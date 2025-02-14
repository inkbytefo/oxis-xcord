import express from 'express';
import { NodeSSH } from 'node-ssh';
import Docker from 'dockerode';
import mongoose from 'mongoose';
import cors from 'cors';
import winston from 'winston';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/server-management';
mongoose.connect(MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Docker setup
const docker = new Docker();

// Schemas
const serverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  host: { type: String, required: true },
  port: { type: Number, required: true },
  sshKey: { type: String, required: true },
  status: { type: String, enum: ['running', 'stopped', 'error'] },
  lastChecked: { type: Date, default: Date.now },
  resources: {
    cpu: Number,
    memory: Number,
    disk: Number
  }
});

const Server = mongoose.model('Server', serverSchema);

// SSH Connection Helper
const connectToServer = async (host, privateKey) => {
  const ssh = new NodeSSH();
  await ssh.connect({
    host,
    username: 'root',
    privateKey
  });
  return ssh;
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List all servers
app.get('/api/servers', async (req, res) => {
  try {
    const servers = await Server.find();
    res.json(servers);
  } catch (error) {
    logger.error('Error fetching servers:', error);
    res.status(500).json({ message: 'Error fetching servers' });
  }
});

// Add new server
app.post('/api/servers', async (req, res) => {
  try {
    const { name, host, port, sshKey } = req.body;
    const server = new Server({
      name,
      host,
      port,
      sshKey,
      status: 'stopped'
    });
    await server.save();
    res.status(201).json(server);
  } catch (error) {
    logger.error('Error adding server:', error);
    res.status(500).json({ message: 'Error adding server' });
  }
});

// Get server status
app.get('/api/servers/:id/status', async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const ssh = await connectToServer(server.host, server.sshKey);
    
    // Get system resources
    const cpuInfo = await ssh.execCommand('top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'');
    const memInfo = await ssh.execCommand('free -m | grep Mem | awk \'{print $3/$2 * 100}\'');
    const diskInfo = await ssh.execCommand('df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'');

    server.resources = {
      cpu: parseFloat(cpuInfo.stdout),
      memory: parseFloat(memInfo.stdout),
      disk: parseFloat(diskInfo.stdout)
    };
    server.lastChecked = new Date();
    await server.save();

    ssh.dispose();
    res.json(server);
  } catch (error) {
    logger.error('Error getting server status:', error);
    res.status(500).json({ message: 'Error getting server status' });
  }
});

// Docker container management
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    res.json(containers);
  } catch (error) {
    logger.error('Error listing containers:', error);
    res.status(500).json({ message: 'Error listing containers' });
  }
});

app.post('/api/containers/:id/start', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    res.json({ message: 'Container started' });
  } catch (error) {
    logger.error('Error starting container:', error);
    res.status(500).json({ message: 'Error starting container' });
  }
});

app.post('/api/containers/:id/stop', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.stop();
    res.json({ message: 'Container stopped' });
  } catch (error) {
    logger.error('Error stopping container:', error);
    res.status(500).json({ message: 'Error stopping container' });
  }
});

// System monitoring
app.get('/api/system/stats', async (req, res) => {
  try {
    const stats = await docker.info();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting system stats:', error);
    res.status(500).json({ message: 'Error getting system stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server Management service running on port ${PORT}`);
});
