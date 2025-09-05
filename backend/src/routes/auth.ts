import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbPool } from '../config/database';
import { jwtConfig } from '../config/database';
import { LoginRequest, RegisterRequest, AuthToken, User, ApiResponse } from '../types';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Register new user
router.post('/register', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, name, tenant_name, role }: RegisterRequest = req.body;

    // Validate input
    if (!email || !password || !name || !tenant_name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Check if user already exists
    const client = await dbPool.connect();
    try {
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
        });
      }

      // Create tenant
      const tenantResult = await client.query(
        'INSERT INTO tenants (name, config) VALUES ($1, $2) RETURNING id',
        [tenant_name, { column_mappings: {}, thresholds: {}, notification_settings: { email: [email] } }]
      );
      const tenantId = tenantResult.rows[0].id;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, role, name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, tenant_id, email, role, name, created_at`,
        [tenantId, email, passwordHash, role, name]
      );

      const user = userResult.rows[0];

      // Generate tokens
      const tokens = generateTokens(user);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: user.tenant_id,
          },
          ...tokens,
        },
        message: 'User registered successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

// Login user
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const client = await dbPool.connect();
    try {
      // Get user with tenant info
      const result = await client.query(
        `SELECT u.*, t.name as tenant_name 
         FROM users u 
         JOIN tenants t ON u.tenant_id = t.id 
         WHERE u.email = $1 AND u.is_active = true`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Update last login
      await client.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const tokens = generateTokens(user);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: user.tenant_id,
            tenant_name: user.tenant_name,
          },
          ...tokens,
        },
        message: 'Login successful',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).user.id;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `SELECT u.*, t.name as tenant_name 
         FROM users u 
         JOIN tenants t ON u.tenant_id = t.id 
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant_name,
          created_at: user.created_at,
          last_login: user.last_login,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
});

// Refresh token
router.post('/refresh', async (req: express.Request, res: express.Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, jwtConfig.secret) as any;
    
    // Get user
    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, role, tenant_id FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token',
        });
      }

      const user = result.rows[0];
      const tokens = generateTokens(user);

      res.json({
        success: true,
        data: tokens,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, (req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

// Helper function to generate JWT tokens
function generateTokens(user: any): AuthToken {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id,
  };

  const accessToken = jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });

  const refreshToken = jwt.sign(
    { userId: user.id },
    jwtConfig.secret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 24 * 60 * 60, // 24 hours in seconds
    token_type: 'Bearer',
  };
}

export default router;
