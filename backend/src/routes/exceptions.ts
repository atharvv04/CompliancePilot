import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';
import { authenticateToken, requireTenant, requireRole } from '../middleware/auth';
import { Exception, ExceptionType, ExceptionStatus, ExceptionSeverity, ApiResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all exceptions
router.get('/', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId;
    const { page = 1, limit = 10, status, type, severity } = req.query;

    const client = await dbPool.connect();
    try {
      let query = `
        SELECT e.*, u.name as owner_name
        FROM exceptions e
        LEFT JOIN users u ON e.owner = u.id
        WHERE e.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (status) {
        query += ' AND e.status = $' + (params.length + 1);
        params.push(status);
      }

      if (type) {
        query += ' AND e.type = $' + (params.length + 1);
        params.push(type);
      }

      if (severity) {
        query += ' AND e.severity = $' + (params.length + 1);
        params.push(severity);
      }

      query += ' ORDER BY e.created_at DESC';

      const offset = (Number(page) - 1) * Number(limit);
      query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(Number(limit), offset);

      const result = await client.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM exceptions WHERE tenant_id = $1';
      const countParams: any[] = [tenantId];
      if (status) {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }
      if (type) {
        countQuery += ' AND type = $' + (countParams.length + 1);
        countParams.push(type);
      }
      if (severity) {
        countQuery += ' AND severity = $' + (countParams.length + 1);
        countParams.push(severity);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const exceptions = result.rows.map((row: any)=> ({
        id: row.id,
        type: row.type,
        title: row.title,
        description: row.description,
        status: row.status,
        severity: row.severity,
        owner: row.owner_name,
        due_date: row.due_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
        remediation_notes: row.remediation_notes,
        attachments: JSON.parse(row.attachments || '[]'),
      }));

      res.status(200).json({
        success: true,
        data: exceptions,
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

// Get exception by ID
router.get('/:id', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `SELECT e.*, u.name as owner_name
         FROM exceptions e
         LEFT JOIN users u ON e.owner = u.id
         WHERE e.id = $1 AND e.tenant_id = $2`,
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Exception not found' });
        return;
      }

      const exception = result.rows[0];

      res.status(200).json({
        success: true,
        data: {
          id: exception.id,
          type: exception.type,
          title: exception.title,
          description: exception.description,
          status: exception.status,
          severity: exception.severity,
          owner: exception.owner_name,
          due_date: exception.due_date,
          created_at: exception.created_at,
          updated_at: exception.updated_at,
          remediation_notes: exception.remediation_notes,
          attachments: JSON.parse(exception.attachments || '[]'),
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

// Create exception
router.post('/', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer', 'operations_head']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId;
    const { type, title, description, severity, due_date, owner } = req.body;

    if (!type || !title || !description || !severity) {
      res.status(400).json({ success: false, error: 'Type, title, description, and severity are required' });
      return;
    }

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `INSERT INTO exceptions (id, tenant_id, type, title, description, severity, due_date, owner)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [uuidv4(), tenantId, type, title, description, severity, due_date || null, owner || null]
      );

      const exception = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: exception.id,
          type: exception.type,
          title: exception.title,
          description: exception.description,
          status: exception.status,
          severity: exception.severity,
          due_date: exception.due_date,
          created_at: exception.created_at,
        },
        message: 'Exception created successfully',
      });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Update exception
router.patch('/:id', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer', 'operations_head']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { status, owner, due_date, remediation_notes } = req.body;

    const client = await dbPool.connect();
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [];

      if (status !== undefined) {
        updates.push('status = $' + (values.length + 1));
        values.push(status);
      }

      if (owner !== undefined) {
        updates.push('owner = $' + (values.length + 1));
        values.push(owner);
      }

      if (due_date !== undefined) {
        updates.push('due_date = $' + (values.length + 1));
        values.push(due_date);
      }

      if (remediation_notes !== undefined) {
        updates.push('remediation_notes = $' + (values.length + 1));
        values.push(remediation_notes);
      }

      if (updates.length === 1) { // Only updated_at
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      values.push(id, tenantId);

      const result = await client.query(
        `UPDATE exceptions SET ${updates.join(', ')} WHERE id = $${values.length - 1} AND tenant_id = $${values.length} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Exception not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.rows[0],
        message: 'Exception updated successfully',
      });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Delete exception
router.delete('/:id', authenticateToken, requireTenant, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'DELETE FROM exceptions WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Exception not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Exception deleted successfully' });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
