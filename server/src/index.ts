import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import morgan from 'morgan'; // Request logger
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Route Imports
import articlesRouter from './routes/articles';
import usersRouter from './routes/users';
import collectionsRouter from './routes/collections';
import tagsRouter from './routes/tags';
import legalRouter from './routes/legal';
import aiRouter from './routes/ai';

dotenv.config();

// MongoDB Connection (Optional - server can run without it)
const MONGODB_URI = process.env.MONGODB_URI;
let mongoConnected = false;

// Workaround for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev')); // Log HTTP requests to console

// API Routes - Log registration for debugging
console.log('[Server] Registering API routes...');
app.use('/api/articles', articlesRouter);
console.log('[Server] ✓ /api/articles registered');
app.use('/api/users', usersRouter);
console.log('[Server] ✓ /api/users registered');
app.use('/api/collections', collectionsRouter);
console.log('[Server] ✓ /api/collections registered');
app.use('/api/categories', tagsRouter);
console.log('[Server] ✓ /api/categories registered');
app.use('/api/legal', legalRouter);
console.log('[Server] ✓ /api/legal registered');
app.use('/api/ai', aiRouter);
console.log('[Server] ✓ /api/ai registered');

// Health Check - MUST work even if MongoDB is down
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoConnected ? 'connected' : 'disconnected',
    server: 'running'
  });
});

// Production: Serve React Static Files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../dist/index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('[Server] Uncaught Exception:', error);
  // Don't exit - log and continue
});

// Start server immediately (don't wait for MongoDB)
// Explicitly bind to 0.0.0.0 to accept connections from all interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] ✓ Express server listening on http://0.0.0.0:${PORT}`);
  console.log(`[Server] ✓ Accessible at http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
  
  // Attempt MongoDB connection (non-blocking)
  if (MONGODB_URI) {
    console.log('[MongoDB] Attempting to connect to MongoDB...');
    mongoose.connect(MONGODB_URI)
      .then(() => {
        mongoConnected = true;
        console.log('[MongoDB] ✓ Connected to MongoDB');
      })
      .catch((error: Error) => {
        mongoConnected = false;
        console.warn('[MongoDB] ⚠️ Connection failed (server continues without MongoDB):', error.message);
        console.warn('[MongoDB] Backend will use in-memory data. Set MONGODB_URI to connect to database.');
      });
  } else {
    console.warn('[MongoDB] ⚠️ MONGODB_URI not set - server running without database');
    console.warn('[MongoDB] Backend will use in-memory data. Set MONGODB_URI in .env to connect to database.');
  }
});