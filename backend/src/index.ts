import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { initializeDatabase, closeConnections } from './config/database';
import { minioService } from './services/MinIOService';
import { appConfig } from './config/database';

// Import routes
import authRoutes from './routes/auth';
import datasetRoutes from './routes/datasets';
import controlRoutes from './routes/controls';
import surveillanceRoutes from './routes/surveillance';
import reportRoutes from './routes/reports';
import exceptionRoutes from './routes/exceptions';
import healthRoutes from './routes/health';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: appConfig.corsOrigin,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/controls', controlRoutes);
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/exceptions', exceptionRoutes);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: appConfig.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(appConfig.nodeEnv !== 'production' && { stack: error.stack }),
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await closeConnections();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Initialize database connections
    await initializeDatabase();
    
    // Initialize MinIO
    await minioService.initialize();
    
    // Start HTTP server
    app.listen(appConfig.port, () => {
      console.log(`🚀 CompliancePilot API server running on port ${appConfig.port}`);
      console.log(`📊 Environment: ${appConfig.nodeEnv}`);
      console.log(`🔗 CORS Origin: ${appConfig.corsOrigin}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
