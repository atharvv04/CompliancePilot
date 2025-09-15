import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';
import { authenticateToken, requireTenant, requireRole } from '../middleware/auth';
import { SurveillanceCase, DetectionType, CaseStatus, CaseSeverity, ApiResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all surveillance cases
router.get('/cases', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId;
    const { page = 1, limit = 10, status, detection_type } = req.query;

    const client = await dbPool.connect();
    try {
      let query = `
        SELECT sc.*, u.name as assigned_to_name
        FROM surveillance_cases sc
        LEFT JOIN users u ON sc.assigned_to = u.id
        WHERE sc.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (status) {
        query += ' AND sc.status = $' + (params.length + 1);
        params.push(status);
      }

      if (detection_type) {
        query += ' AND sc.detection_type = $' + (params.length + 1);
        params.push(detection_type);
      }

      query += ' ORDER BY sc.created_at DESC';

      const offset = (Number(page) - 1) * Number(limit);
      query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(Number(limit), offset);

      const result = await client.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM surveillance_cases WHERE tenant_id = $1';
      const countParams: any[] = [tenantId];
      if (status) {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }
      if (detection_type) {
        countQuery += ' AND detection_type = $' + (countParams.length + 1);
        countParams.push(detection_type);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const cases = result.rows.map((row: any) => ({
        id: row.id,
        detection_type: row.detection_type,
        title: row.title,
        status: row.status,
        severity: row.severity,
        client_id: row.client_id,
        symbol: row.symbol,
        detection_date: row.detection_date,
        narrative: row.narrative,
        exhibits: JSON.parse(row.exhibits || '[]'),
        created_at: row.created_at,
        updated_at: row.updated_at,
        assigned_to: row.assigned_to_name,
      }));

      res.status(200).json({
        success: true,
        data: cases,
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

// Get case by ID
router.get('/cases/:id', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `SELECT sc.*, u.name as assigned_to_name
         FROM surveillance_cases sc
         LEFT JOIN users u ON sc.assigned_to = u.id
         WHERE sc.id = $1 AND sc.tenant_id = $2`,
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Case not found' });
        return;
      }

      const caseData = result.rows[0];

      res.status(200).json({
        success: true,
        data: {
          id: caseData.id,
          detection_type: caseData.detection_type,
          title: caseData.title,
          status: caseData.status,
          severity: caseData.severity,
          client_id: caseData.client_id,
          symbol: caseData.symbol,
          detection_date: caseData.detection_date,
          narrative: caseData.narrative,
          exhibits: JSON.parse(caseData.exhibits || '[]'),
          created_at: caseData.created_at,
          updated_at: caseData.updated_at,
          assigned_to: caseData.assigned_to_name,
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

// Update case status
router.patch('/cases/:id/status', authenticateToken, requireTenant, requireRole(['admin', 'surveillance_analyst']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, narrative } = req.body;
    const tenantId = (req as any).tenantId;

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }

    const client = await dbPool.connect();
    try {
      const updates: string[] = ['status = $1', 'updated_at = NOW()'];
      const values: any[] = [status];

      if (narrative !== undefined) {
        updates.push('narrative = $' + (values.length + 1));
        values.push(narrative);
      }

      values.push(id, tenantId);

      const result = await client.query(
        `UPDATE surveillance_cases SET ${updates.join(', ')} WHERE id = $${values.length - 1} AND tenant_id = $${values.length} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Case not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.rows[0],
        message: 'Case status updated successfully',
      });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Assign case
router.patch('/cases/:id/assign', authenticateToken, requireTenant, requireRole(['admin', 'surveillance_analyst']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;
    const tenantId = (req as any).tenantId;

    if (!assigned_to) {
      res.status(400).json({ success: false, error: 'Assigned user ID is required' });
      return;
    }

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'UPDATE surveillance_cases SET assigned_to = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *',
        [assigned_to, id, tenantId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Case not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.rows[0],
        message: 'Case assigned successfully',
      });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Run surveillance scan
router.post('/scan', authenticateToken, requireTenant, requireRole(['admin', 'surveillance_analyst']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dataset_id, detection_types } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user.id;

    if (!dataset_id) {
      res.status(400).json({ success: false, error: 'Dataset ID is required' });
      return;
    }

    // TODO: Implement actual surveillance scanning logic
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        scan_id: uuidv4(),
        status: 'completed',
        cases_found: 0,
        message: 'Surveillance scan completed (placeholder)',
      },
    });
    return;
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
