import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import morgan from 'morgan'; // Request logger
import helmet from 'helmet';
import compression from 'compression'; // Gzip compression
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Workaround for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
// Go up from server/src to project root
const rootPath = path.resolve(__dirname, '../../');
dotenv.config({ path: path.join(rootPath, '.env') });

// Database
import { connectDB } from './utils/db.js';
import { seedDatabase } from './utils/seed.js';
import { clearDatabase } from './utils/clearDatabase.js';

// Route Imports
import authRouter from './routes/auth.js';
import articlesRouter from './routes/articles';
import usersRouter from './routes/users';
import collectionsRouter from './routes/collections';
import tagsRouter from './routes/tags';
import legalRouter from './routes/legal';
import aiRouter from './routes/ai';
import feedbackRouter from './routes/feedback.js';
import moderationRouter from './routes/moderation.js';
import adminRouter from './routes/admin.js';
import unfurlRouter from './routes/unfurl.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Compression Middleware (Gzip) - Reduces JSON response size by ~70%
app.use(compression({
  filter: (req, res) => {
    // Compress all responses except if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  },
  level: 6 // Balance between compression and CPU (0-9, 6 is good default)
}));

// Security Middleware
app.use(helmet());
app.use(cors());

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev')); // Log HTTP requests to console

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/users', usersRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/categories', tagsRouter);
app.use('/api/legal', legalRouter);
app.use('/api/ai', aiRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/moderation', moderationRouter);
app.use('/api/unfurl', unfurlRouter);
app.use('/api/admin', adminRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Clear Database Endpoint (for development/admin use)
app.post('/api/clear-db', async (req, res) => {
  try {
    await clearDatabase();
    res.json({ 
      success: true, 
      message: 'Database cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[API] Clear DB error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to clear database',
      error: error.message 
    });
  }
});

// API 404 Handler - MUST come before React static file handler
// Prevents API requests from falling through to index.html
// Express 5 requires named wildcard parameters - using regex pattern for compatibility
app.all(/^\/api\/.+/, (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.originalUrl} does not exist`,
    path: req.originalUrl
  });
});

// Production: Serve React Static Files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../../dist')));
  // Catch-all handler for React Router (only for non-API routes)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../dist/index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Initialize Database and Start Server
let server: any = null;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Seed database if empty
    // TEMPORARILY DISABLED: Seeding is disabled. Re-enable by uncommenting the line below when needed.
    // await seedDatabase();
    
    // Start server and store reference for graceful shutdown
    server = app.listen(PORT, () => {
      console.log(`[Server] ✓ Running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] Compression: Enabled`);
      console.log(`[Server] Graceful Shutdown: Enabled`);
    });
    
    return server;
  } catch (error: any) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
}

// Graceful Shutdown Handler
async function gracefulShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('[Server] HTTP server closed');
    });
  }
  
  // Close MongoDB connection
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close();
      console.log('[Server] MongoDB connection closed');
    } catch (error: any) {
      console.error('[Server] Error closing MongoDB:', error.message);
    }
  }
  
  // Give connections time to close, then exit
  setTimeout(() => {
    console.log('[Server] Graceful shutdown complete');
    process.exit(0);
  }, 5000); // 5 second grace period
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global Exception Handlers
process.on('uncaughtException', (error: Error) => {
  console.error('[Server] UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  
  // Attempt graceful shutdown
  gracefulShutdown('uncaughtException').then(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[Server] UNHANDLED REJECTION! Shutting down...');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  
  // Log but don't exit immediately (let the app try to recover)
  // In production, you might want to exit here too
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('unhandledRejection').then(() => {
      process.exit(1);
    });
  }
});

// Start the server
startServer();