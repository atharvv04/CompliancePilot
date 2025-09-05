import { Pool, PoolConfig } from 'pg';
import { createClient, RedisClientType } from 'redis';

// Database configuration
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'compliance_pilot',
  user: process.env.DB_USER || 'compliance_user',
  password: process.env.DB_PASSWORD || 'compliance_pass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Redis configuration
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// MinIO configuration
export const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
};

// JWT configuration
export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

// Application configuration
export const appConfig = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  fileUploadLimit: parseInt(process.env.FILE_UPLOAD_LIMIT || '10485760'), // 10MB
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
};

// Database connection pool
export const dbPool = new Pool(dbConfig);

// Redis client
export const redisClient: RedisClientType = createClient(redisConfig);

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test database connection
    const client = await dbPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully');

    // Connect to Redis
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeConnections = async (): Promise<void> => {
  try {
    await dbPool.end();
    await redisClient.quit();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};

// Health check
export const healthCheck = async (): Promise<{ database: boolean; redis: boolean }> => {
  const health = { database: false, redis: false };

  try {
    const client = await dbPool.connect();
    await client.query('SELECT 1');
    client.release();
    health.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  try {
    await redisClient.ping();
    health.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  return health;
};
