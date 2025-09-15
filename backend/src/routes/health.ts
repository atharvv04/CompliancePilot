import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { healthCheck } from '../config/database';
import { minioService } from '../services/MinIOService';

const router = express.Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    return;
  } catch (error: unknown) {
    next(error);
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    return;
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
