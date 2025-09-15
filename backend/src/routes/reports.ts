import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';
import { minioService } from '../services/MinIOService';
import { authenticateToken, requireTenant, requireRole } from '../middleware/auth';
import { Report, ReportTemplate, ReportType, ReportStatus, ApiResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const router = express.Router();

// Get all reports
router.get('/', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId;
    const { page = 1, limit = 10, type } = req.query;

    const client = await dbPool.connect();
    try {
      let query = `
        SELECT r.*, rt.name as template_name, u.name as created_by_name
        FROM reports r
        JOIN report_templates rt ON r.template_id = rt.id
        JOIN users u ON r.created_by = u.id
        WHERE r.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (type) {
        query += ' AND r.type = $2';
        params.push(type);
      }

      query += ' ORDER BY r.generated_at DESC';

      const offset = (Number(page) - 1) * Number(limit);
      query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(Number(limit), offset);

      const result = await client.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM reports WHERE tenant_id = $1';
      const countParams: any[] = [tenantId];
      if (type) {
        countQuery += ' AND type = $2';
        countParams.push(type);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const reports = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        status: row.status,
        generated_at: row.generated_at,
        file_hash: row.file_hash,
        signature: row.signature,
        template_name: row.template_name,
        created_by: row.created_by_name,
      }));

      res.status(200).json({
        success: true,
        data: reports,
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

// Get report templates
router.get('/templates', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM report_templates WHERE is_active = true ORDER BY name'
      );

      const templates = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        output_format: row.output_format,
        parameters: JSON.parse(row.parameters || '[]'),
      }));

      res.status(200).json({
        success: true,
        data: templates,
      });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Generate report
router.post('/generate', authenticateToken, requireTenant, requireRole(['admin', 'compliance_officer']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { template_id, name, parameters = {} } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user.id;

    if (!template_id || !name) {
      res.status(400).json({ success: false, error: 'Template ID and name are required' });
      return;
    }

    const client = await dbPool.connect();
    try {
      // Get template
      const templateResult = await client.query(
        'SELECT * FROM report_templates WHERE id = $1 AND is_active = true',
        [template_id]
      );

      if (templateResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Template not found' });
        return;
      }

      const template = templateResult.rows[0];

      // Create report record
      const reportId = uuidv4();
      await client.query(
        `INSERT INTO reports (id, tenant_id, template_id, name, type, status, parameters, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [reportId, tenantId, template_id, name, template.type, 'generating', JSON.stringify(parameters), userId]
      );

      // TODO: Implement actual report generation logic
      // For now, create a placeholder report
      const reportContent = `Placeholder report for ${name}\nGenerated at: ${new Date().toISOString()}\nParameters: ${JSON.stringify(parameters)}`;
      const reportBuffer = Buffer.from(reportContent, 'utf8');
      const reportHash = crypto.createHash('sha256').update(reportBuffer).digest('hex');
      const signature = crypto.createHash('sha256').update(reportHash + tenantId).digest('hex');

      // Upload report to MinIO
      const uploadResult = await minioService.uploadFile(
        reportBuffer,
        `${name}.txt`,
        tenantId,
        'reports',
        'text/plain'
      );

      // Update report with generated file info
      await client.query(
        `UPDATE reports SET status = $1, generated_at = NOW(), file_path = $2, file_hash = $3, signature = $4
         WHERE id = $5`,
        ['completed', uploadResult.path, reportHash, signature, reportId]
      );

      res.status(200).json({
        success: true,
        data: {
          id: reportId,
          name,
          type: template.type,
          status: 'completed',
          generated_at: new Date(),
          file_hash: reportHash,
          signature,
        },
        message: 'Report generated successfully',
      });
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Download report
router.get('/:id/download', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'SELECT file_path, name, type FROM reports WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
      }

      const report = result.rows[0];
      const fileBuffer = await minioService.downloadFile(report.file_path);

      // Set appropriate content type based on report type
      let contentType = 'application/octet-stream';
      let extension = 'txt';
      
      if (report.type === 'exchange') {
        contentType = 'text/csv';
        extension = 'csv';
      } else if (report.type === 'board_mis') {
        contentType = 'application/pdf';
        extension = 'pdf';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.name}.${extension}"`);
      res.send(fileBuffer);
      return;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    next(error);
  }
});

// Get report by ID
router.get('/:id', authenticateToken, requireTenant, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `SELECT r.*, rt.name as template_name, u.name as created_by_name
         FROM reports r
         JOIN report_templates rt ON r.template_id = rt.id
         JOIN users u ON r.created_by = u.id
         WHERE r.id = $1 AND r.tenant_id = $2`,
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
      }

      const report = result.rows[0];

      res.status(200).json({
        success: true,
        data: {
          id: report.id,
          name: report.name,
          type: report.type,
          status: report.status,
          generated_at: report.generated_at,
          file_hash: report.file_hash,
          signature: report.signature,
          parameters: JSON.parse(report.parameters || '{}'),
          template_name: report.template_name,
          created_by: report.created_by_name,
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

export default router;
