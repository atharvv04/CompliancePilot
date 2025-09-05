import express from 'express';
import { healthCheck } from '../config/database';
import { minioService } from '../services/MinIOService';

const router = express.Router();

// Health check endpoint
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const dbHealth = await healthCheck();
    const minioHealth = await minioService.healthCheck();

    const isHealthy = dbHealth.database && dbHealth.redis && minioHealth;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth.database,
        redis: dbHealth.redis,
        minio: minioHealth,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: express.Request, res: express.Response) => {
  try {
    const dbHealth = await healthCheck();
    const minioHealth = await minioService.healthCheck();

    const isHealthy = dbHealth.database && dbHealth.redis && minioHealth;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: {
          status: dbHealth.database ? 'up' : 'down',
          redis: dbHealth.redis ? 'up' : 'down',
        },
        minio: {
          status: minioHealth ? 'up' : 'down',
        },
      },
    });
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export default router;
