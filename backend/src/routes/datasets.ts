import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { dbPool } from '../config/database';
import { minioService } from '../services/MinIOService';
import { authenticateToken, requireTenant } from '../middleware/auth';
import { Dataset, DatasetType, ApiResponse, FileUploadResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  },
});

// Upload dataset file
router.post('/upload', authenticateToken, requireTenant, upload.single('file'), async (req: express.Request, res: express.Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user.id;
    const { name, type, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Dataset name and type are required',
      });
    }

    // Validate dataset type
    const validTypes: DatasetType[] = ['orders', 'trades', 'ledger', 'ucc', 'recon_bank', 'recon_dp', 'nbbo'];
    if (!validTypes.includes(type as DatasetType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dataset type',
      });
    }

    // Parse file to get schema and row count
    const { schema, rowCount } = await parseFileSchema(req.file.buffer, req.file.mimetype);

    // Upload file to MinIO
    const uploadResult = await minioService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      tenantId,
      type,
      req.file.mimetype
    );

    // Save dataset record to database
    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `INSERT INTO datasets (id, tenant_id, name, type, schema, file_path, file_hash, row_count, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          uuidv4(),
          tenantId,
          name,
          type,
          JSON.stringify(schema),
          uploadResult.path,
          uploadResult.hash,
          rowCount,
          userId,
        ]
      );

      const dataset = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: dataset.id,
          name: dataset.name,
          type: dataset.type,
          schema: JSON.parse(dataset.schema),
          row_count: dataset.row_count,
          uploaded_at: dataset.uploaded_at,
        },
        message: 'Dataset uploaded successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Dataset upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload dataset',
    });
  }
});

// Get all datasets for tenant
router.get('/', authenticateToken, requireTenant, async (req: express.Request, res: express.Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { page = 1, limit = 10, type } = req.query;

    const client = await dbPool.connect();
    try {
      let query = `
        SELECT d.*, u.name as uploaded_by_name
        FROM datasets d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (type) {
        query += ' AND d.type = $2';
        params.push(type);
      }

      query += ' ORDER BY d.uploaded_at DESC';

      // Add pagination
      const offset = (Number(page) - 1) * Number(limit);
      query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(Number(limit), offset);

      const result = await client.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM datasets WHERE tenant_id = $1';
      const countParams: any[] = [tenantId];
      if (type) {
        countQuery += ' AND type = $2';
        countParams.push(type);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const datasets = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        schema: JSON.parse(row.schema),
        row_count: row.row_count,
        uploaded_at: row.uploaded_at,
        uploaded_by: row.uploaded_by_name,
      }));

      res.json({
        success: true,
        data: datasets,
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
    console.error('Get datasets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch datasets',
    });
  }
});

// Get dataset by ID
router.get('/:id', authenticateToken, requireTenant, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `SELECT d.*, u.name as uploaded_by_name
         FROM datasets d
         JOIN users u ON d.uploaded_by = u.id
         WHERE d.id = $1 AND d.tenant_id = $2`,
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Dataset not found',
        });
      }

      const dataset = result.rows[0];

      res.json({
        success: true,
        data: {
          id: dataset.id,
          name: dataset.name,
          type: dataset.type,
          schema: JSON.parse(dataset.schema),
          row_count: dataset.row_count,
          uploaded_at: dataset.uploaded_at,
          uploaded_by: dataset.uploaded_by_name,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get dataset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dataset',
    });
  }
});

// Download dataset file
router.get('/:id/download', authenticateToken, requireTenant, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'SELECT file_path FROM datasets WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Dataset not found',
        });
      }

      const filePath = result.rows[0].file_path;
      const fileBuffer = await minioService.downloadFile(filePath);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="dataset_${id}.csv"`);
      res.send(fileBuffer);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Download dataset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download dataset',
    });
  }
});

// Delete dataset
router.delete('/:id', authenticateToken, requireTenant, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const client = await dbPool.connect();
    try {
      // Get dataset info
      const result = await client.query(
        'SELECT file_path FROM datasets WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Dataset not found',
        });
      }

      const filePath = result.rows[0].file_path;

      // Delete from MinIO
      await minioService.deleteFile(filePath);

      // Delete from database
      await client.query(
        'DELETE FROM datasets WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      res.json({
        success: true,
        message: 'Dataset deleted successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete dataset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete dataset',
    });
  }
});

// Helper function to parse file schema
async function parseFileSchema(buffer: Buffer, mimeType: string): Promise<{ schema: any; rowCount: number }> {
  return new Promise((resolve, reject) => {
    try {
      if (mimeType === 'text/csv') {
        // Parse CSV
        const rows: any[] = [];
        const columns = new Set<string>();

        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        bufferStream
          .pipe(csv())
          .on('data', (row: any) => {
            rows.push(row);
            Object.keys(row).forEach(key => columns.add(key));
          })
          .on('end', () => {
            const schema = {
              columns: Array.from(columns).map(col => ({
                name: col,
                type: 'string', // Default to string, could be enhanced with type detection
                nullable: true,
              })),
              primary_key: [],
              indexes: [],
            };

            resolve({ schema, rowCount: rows.length });
          })
          .on('error', reject);
      } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        // Parse Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const columns = new Set<string>();
        jsonData.forEach((row: any) => {
          Object.keys(row).forEach(key => columns.add(key));
        });

        const schema = {
          columns: Array.from(columns).map(col => ({
            name: col,
            type: 'string',
            nullable: true,
          })),
          primary_key: [],
          indexes: [],
        };

        resolve({ schema, rowCount: jsonData.length });
      } else {
        reject(new Error('Unsupported file type'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

export default router;
