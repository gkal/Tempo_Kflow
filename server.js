// Simple Express server to serve the built application
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './src/utils/loggingUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_IP = '192.168.1.80'; // Your static IP address

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// For any request that doesn't match a static file, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running at http://localhost:${PORT}`);
  logger.info(`For network access, use: http://${STATIC_IP}:${PORT}`);
  logger.info(`Application is now available in PRODUCTION mode`);
}); 