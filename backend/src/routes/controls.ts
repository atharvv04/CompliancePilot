import express from 'express';
import { dbPool } from '../config/database';
import { controlsEngine } from '../services/ControlsEngine';
import { authenticateToken, requireTenant, requireRole } from '../middleware/auth';
import { Control, ControlRun, ControlCategory, ControlFrequency, ControlSeverity, ApiResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all controls for tenant
router.get('/', authenticateToken, requireTenant, async (req: express.Request, res: express.Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { page = 1, limit = 10, category, status = 'active' } = req.query;

    const client = await dbPool.connect();
    try {
      let query = `
        SELECT c.*, u.name as created_by_name
        FROM controls c
        JOIN users u ON c.created_by = u.id
        WHERE c.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (category) {
        query += ' AND c.category = $2';
        params.push(category);
      }

      if (status === 'active') {
        query += ' AND c.is_active = true';
      }

      query += ' ORDER BY c.created_at DESC';

      // Add pagination
      const offset = (Number(page) - 1) * Number(limit);
      query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(Number(limit), offset);

      const result = await client.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM controls WHERE tenant_id = $1';
      const countParams: any[] = [tenantId];
      if (category) {
        countQuery += ' AND category = $2';
        countParams.push(category);
      }
      if (status === 'active') {
        countQuery += ' AND is_active = true';
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const controls = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        dataset: row.dataset,
        frequency: row.frequency,
        severity: row.severity,
        version: row.version,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by_name,
      }));

      res.json({
        success: true,
        data: controls,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          total_pages: Math.ceil(total / Number(limit)),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get controls error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch controls',
    });
  }
});

// Get control by ID
router.get('/:id', authenticateToken, requireTenant, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `SELECT c.*, u.name as created_by_name
         FROM controls c
         JOIN users u ON c.created_by = u.id
         WHERE c.id = $1 AND c.tenant_id = $2`,
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Control not found',
        });
      }

      const control = result.rows[0];

      res.json({
        success: true,
        data: {
          id: control.id,
          title: control.title,
          description: control.description,
          category: control.category,
          dataset: control.dataset,
          frequency: control.frequency,
          severity: control.severity,
          version: control.version,
          yaml_config: control.yaml_config,
          is_active: control.is_active,
          created_at: control.created_at,
          updated_at: control.updated_at,
          created_by: control.created_by_name,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get control error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch control',
    });
  }
});

// Create new control
router.post('/', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer']), async (req: express.Request, res: express.Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user.id;
    const { title, description, category, dataset, frequency, severity, yaml_config } = req.body;

    // Validate required fields
    if (!title || !category || !dataset || !frequency || !severity || !yaml_config) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate control YAML
    try {
      await controlsEngine.parseControlYAML(yaml_config);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Invalid YAML configuration: ${error.message}`,
      });
    }

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `INSERT INTO controls (id, tenant_id, title, description, category, dataset, frequency, severity, yaml_config, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          uuidv4(),
          tenantId,
          title,
          description || '',
          category,
          dataset,
          frequency,
          severity,
          yaml_config,
          userId,
        ]
      );

      const control = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: control.id,
          title: control.title,
          description: control.description,
          category: control.category,
          dataset: control.dataset,
          frequency: control.frequency,
          severity: control.severity,
          version: control.version,
          is_active: control.is_active,
          created_at: control.created_at,
        },
        message: 'Control created successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create control error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create control',
    });
  }
});

// Update control
router.put('/:id', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer']), async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { title, description, category, dataset, frequency, severity, yaml_config, is_active } = req.body;

    // Validate YAML if provided
    if (yaml_config) {
      try {
        await controlsEngine.parseControlYAML(yaml_config);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Invalid YAML configuration: ${error.message}`,
        });
      }
    }

    const client = await dbPool.connect();
    try {
      // Check if control exists
      const existingResult = await client.query(
        'SELECT id FROM controls WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Control not found',
        });
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(category);
      }
      if (dataset !== undefined) {
        updates.push(`dataset = $${paramCount++}`);
        values.push(dataset);
      }
      if (frequency !== undefined) {
        updates.push(`frequency = $${paramCount++}`);
        values.push(frequency);
      }
      if (severity !== undefined) {
        updates.push(`severity = $${paramCount++}`);
        values.push(severity);
      }
      if (yaml_config !== undefined) {
        updates.push(`yaml_config = $${paramCount++}`);
        values.push(yaml_config);
        updates.push(`version = version + 1`); // Increment version when YAML changes
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id, tenantId);

      const result = await client.query(
        `UPDATE controls SET ${updates.join(', ')} WHERE id = $${paramCount++} AND tenant_id = $${paramCount++} RETURNING *`,
        values
      );

      const control = result.rows[0];

      res.json({
        success: true,
        data: {
          id: control.id,
          title: control.title,
          description: control.description,
          category: control.category,
          dataset: control.dataset,
          frequency: control.frequency,
          severity: control.severity,
          version: control.version,
          is_active: control.is_active,
          updated_at: control.updated_at,
        },
        message: 'Control updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update control error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update control',
    });
  }
});

// Execute control
router.post('/:id/execute', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer']), async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { dataset_id } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user.id;

    if (!dataset_id) {
      return res.status(400).json({
        success: false,
        error: 'Dataset ID is required',
      });
    }

    // Execute control
    const controlRun = await controlsEngine.executeControl(id, dataset_id, tenantId, userId);

    res.json({
      success: true,
      data: controlRun,
      message: 'Control executed successfully',
    });
  } catch (error) {
    console.error('Execute control error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute control',
    });
  }
});

// Get control runs
router.get('/:id/runs', authenticateToken, requireTenant, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { page = 1, limit = 10 } = req.query;

    const client = await dbPool.connect();
    try {
      const offset = (Number(page) - 1) * Number(limit);

      const result = await client.query(
        `SELECT cr.*, d.name as dataset_name, u.name as triggered_by_name
         FROM control_runs cr
         JOIN datasets d ON cr.dataset_id = d.id
         JOIN users u ON cr.triggered_by = u.id
         WHERE cr.control_id = $1 AND cr.tenant_id = $2
         ORDER BY cr.started_at DESC
         LIMIT $3 OFFSET $4`,
        [id, tenantId, Number(limit), offset]
      );

      // Get total count
      const countResult = await client.query(
        'SELECT COUNT(*) FROM control_runs WHERE control_id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      const total = parseInt(countResult.rows[0].count);

      const runs = result.rows.map(row => ({
        id: row.id,
        status: row.status,
        started_at: row.started_at,
        completed_at: row.completed_at,
        results: row.results,
        evidence_hash: row.evidence_hash,
        error_message: row.error_message,
        dataset_name: row.dataset_name,
        triggered_by: row.triggered_by_name,
      }));

      res.json({
        success: true,
        data: runs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          total_pages: Math.ceil(total / Number(limit)),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get control runs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch control runs',
    });
  }
});

// Delete control
router.delete('/:id', authenticateToken, requireTenant, requireRole(['admin']), async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'DELETE FROM controls WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Control not found',
        });
      }

      res.json({
        success: true,
        message: 'Control deleted successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete control error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete control',
    });
  }
});

export default router;
