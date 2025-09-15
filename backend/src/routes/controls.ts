import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';
import { controlsEngine } from '../services/ControlsEngine';
import { authenticateToken, requireTenant, requireRole } from '../middleware/auth';
import { Control, ControlRun, ControlCategory, ControlFrequency, ControlSeverity, ApiResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all controls for tenant
router.get('/', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const controls = result.rows.map((row: any) => ({
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

      res.status(200).json({
        success: true,
        data: controls,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          total_pages: Math.ceil(total / Number(limit)),
        },
      });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Get control by ID
router.get('/:id', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        res.status(404).json({ success: false, error: 'Control not found' });
        return;
      }

      const control = result.rows[0];

      res.status(200).json({
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
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Create new control
router.post('/', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user.id;
    const { title, description, category, dataset, frequency, severity, yaml_config } = req.body;

    // Validate required fields
    if (!title || !category || !dataset || !frequency || !severity || !yaml_config) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Validate control YAML
    try {
      await controlsEngine.parseControlYAML(yaml_config);
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: `Invalid YAML configuration: ${error instanceof Error ? error.message : 'Unknown error'}` });
      return;
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
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Update control
router.put('/:id', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { title, description, category, dataset, frequency, severity, yaml_config, is_active } = req.body;

    // Validate YAML if provided
    if (yaml_config) {
      try {
        await controlsEngine.parseControlYAML(yaml_config);
      } catch (error: any) {
        res.status(400).json({ success: false, error: `Invalid YAML configuration: ${error.message}` });
        return;
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
        res.status(404).json({ success: false, error: 'Control not found' });
        return;
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
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      updates.push(`updated_at = NOW()`);
      values.push(id, tenantId);

      const result = await client.query(
        `UPDATE controls SET ${updates.join(', ')} WHERE id = $${paramCount++} AND tenant_id = $${paramCount++} RETURNING *`,
        values
      );

      const control = result.rows[0];

      res.status(200).json({
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
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Execute control
router.post('/:id/execute', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { dataset_id } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user.id;

    if (!dataset_id) {
      res.status(400).json({ success: false, error: 'Dataset ID is required' });
      return;
    }

    // Execute control
    const controlRun = await controlsEngine.executeControl(id, dataset_id, tenantId, userId);

    res.status(200).json({
      success: true,
      data: controlRun,
      message: 'Control executed successfully',
    });
    return;
  } catch (error: unknown) {
    next(error);
  }
});

// Get control runs
router.get('/:id/runs', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const runs = result.rows.map((row: any) => ({
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

      res.status(200).json({
        success: true,
        data: runs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          total_pages: Math.ceil(total / Number(limit)),
        },
      });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Delete control
router.delete('/:id', authenticateToken, requireTenant, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        res.status(404).json({ success: false, error: 'Control not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Control deleted successfully' });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
