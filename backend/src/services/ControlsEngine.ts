import { dbPool } from '../config/database';
import { Control, ControlRun, ControlResults, EvidenceFile, RunStatus } from '../types';
import { minioService } from './MinIOService';
import { v4 as uuidv4 } from 'uuid';
import * as yaml from 'yaml';
import * as crypto from 'crypto';

export interface ControlDefinition {
  id: string;
  title: string;
  dataset: string;
  frequency: string;
  severity: string;
  logic: {
    sql: string;
    params?: Record<string, any>;
  };
  pass_condition: string;
  evidence: {
    exports: Array<{
      name: string;
      query: string;
    }>;
  };
}

export class ControlsEngine {
  async parseControlYAML(yamlConfig: string): Promise<ControlDefinition> {
    try {
      const control = yaml.parse(yamlConfig) as ControlDefinition;
      
      // Validate required fields
      if (!control.id || !control.title || !control.dataset || !control.logic?.sql) {
        throw new Error('Invalid control definition: missing required fields');
      }

      return control;
    } catch (error) {
      console.error('Failed to parse control YAML:', error);
      throw new Error(`Invalid YAML configuration: ${error.message}`);
    }
  }

  async executeControl(controlId: string, datasetId: string, tenantId: string, triggeredBy: string): Promise<ControlRun> {
    const startTime = Date.now();
    const runId = uuidv4();

    try {
      // Get control definition
      const control = await this.getControl(controlId);
      if (!control) {
        throw new Error(`Control not found: ${controlId}`);
      }

      // Get dataset information
      const dataset = await this.getDataset(datasetId);
      if (!dataset) {
        throw new Error(`Dataset not found: ${datasetId}`);
      }

      // Create control run record
      const controlRun = await this.createControlRun({
        id: runId,
        control_id: controlId,
        dataset_id: datasetId,
        tenant_id: tenantId,
        status: 'running' as RunStatus,
        started_at: new Date(),
        triggered_by: triggeredBy,
      });

      // Parse control YAML
      const controlDef = await this.parseControlYAML(control.yaml_config);

      // Execute control logic
      const results = await this.executeControlLogic(controlDef, dataset, tenantId);

      // Generate evidence files
      const evidenceFiles = await this.generateEvidenceFiles(controlDef, dataset, tenantId, runId);

      // Update control run with results
      const executionTime = Date.now() - startTime;
      const finalResults: ControlResults = {
        ...results,
        execution_time_ms: executionTime,
        evidence_files: evidenceFiles,
      };

      await this.updateControlRun(runId, {
        status: 'completed' as RunStatus,
        completed_at: new Date(),
        results: finalResults,
        evidence_hash: this.generateEvidenceHash(evidenceFiles),
      });

      return {
        ...controlRun,
        status: 'completed' as RunStatus,
        completed_at: new Date(),
        results: finalResults,
        evidence_hash: this.generateEvidenceHash(evidenceFiles),
      };

    } catch (error) {
      console.error(`Control execution failed for ${controlId}:`, error);
      
      await this.updateControlRun(runId, {
        status: 'failed' as RunStatus,
        completed_at: new Date(),
        error_message: error.message,
      });

      throw error;
    }
  }

  private async executeControlLogic(
    controlDef: ControlDefinition,
    dataset: any,
    tenantId: string
  ): Promise<Partial<ControlResults>> {
    try {
      // Replace parameters in SQL query
      let sqlQuery = controlDef.logic.sql;
      if (controlDef.logic.params) {
        for (const [key, value] of Object.entries(controlDef.logic.params)) {
          sqlQuery = sqlQuery.replace(new RegExp(`:${key}`, 'g'), `'${value}'`);
        }
      }

      // Replace dataset reference with actual table name
      const tableName = `dataset_${dataset.id.replace(/-/g, '_')}`;
      sqlQuery = sqlQuery.replace(/FROM\s+(\w+)/gi, `FROM ${tableName}`);

      // Execute SQL query
      const client = await dbPool.connect();
      try {
        const result = await client.query(sqlQuery);
        
        // Evaluate pass condition
        const passed = this.evaluatePassCondition(controlDef.pass_condition, result.rows.length);

        return {
          passed,
          result_count: result.rows.length,
          evidence_count: result.rows.length,
          summary: this.generateSummary(controlDef, result.rows.length, passed),
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('SQL execution failed:', error);
      throw new Error(`SQL execution failed: ${error.message}`);
    }
  }

  private async generateEvidenceFiles(
    controlDef: ControlDefinition,
    dataset: any,
    tenantId: string,
    runId: string
  ): Promise<EvidenceFile[]> {
    const evidenceFiles: EvidenceFile[] = [];

    for (const exportDef of controlDef.evidence.exports) {
      try {
        // Execute evidence query
        let evidenceQuery = exportDef.query;
        const tableName = `dataset_${dataset.id.replace(/-/g, '_')}`;
        evidenceQuery = evidenceQuery.replace(/FROM\s+(\w+)/gi, `FROM ${tableName}`);

        const client = await dbPool.connect();
        try {
          const result = await client.query(evidenceQuery);
          
          // Convert to CSV
          const csvContent = this.convertToCSV(result.rows);
          const buffer = Buffer.from(csvContent, 'utf8');

          // Upload to MinIO
          const uploadResult = await minioService.uploadFile(
            buffer,
            exportDef.name,
            tenantId,
            'evidence',
            'text/csv'
          );

          evidenceFiles.push({
            name: exportDef.name,
            path: uploadResult.path,
            hash: uploadResult.hash,
            row_count: result.rows.length,
            description: `Evidence for ${controlDef.title}`,
          });
        } finally {
          client.release();
        }
      } catch (error) {
        console.error(`Failed to generate evidence file ${exportDef.name}:`, error);
        // Continue with other evidence files
      }
    }

    return evidenceFiles;
  }

  private evaluatePassCondition(condition: string, resultCount: number): boolean {
    try {
      // Replace result_count with actual count
      const expression = condition.replace('result_count', resultCount.toString());
      
      // Simple evaluation (in production, use a proper expression evaluator)
      if (expression.includes('=')) {
        const [left, right] = expression.split('=').map(s => s.trim());
        return parseInt(left) === parseInt(right);
      } else if (expression.includes('>')) {
        const [left, right] = expression.split('>').map(s => s.trim());
        return parseInt(left) > parseInt(right);
      } else if (expression.includes('<')) {
        const [left, right] = expression.split('<').map(s => s.trim());
        return parseInt(left) < parseInt(right);
      }
      
      return false;
    } catch (error) {
      console.error('Failed to evaluate pass condition:', error);
      return false;
    }
  }

  private generateSummary(controlDef: ControlDefinition, resultCount: number, passed: boolean): string {
    const status = passed ? 'PASSED' : 'FAILED';
    return `${controlDef.title}: ${status} - Found ${resultCount} violations`;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private generateEvidenceHash(evidenceFiles: EvidenceFile[]): string {
    const hash = crypto.createHash('sha256');
    for (const file of evidenceFiles) {
      hash.update(file.hash);
    }
    return hash.digest('hex');
  }

  private async getControl(controlId: string): Promise<Control | null> {
    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM controls WHERE id = $1',
        [controlId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  private async getDataset(datasetId: string): Promise<any> {
    const client = await dbPool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM datasets WHERE id = $1',
        [datasetId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  private async createControlRun(run: Partial<ControlRun>): Promise<ControlRun> {
    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `INSERT INTO control_runs (id, control_id, dataset_id, tenant_id, status, started_at, triggered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [run.id, run.control_id, run.dataset_id, run.tenant_id, run.status, run.started_at, run.triggered_by]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  private async updateControlRun(runId: string, updates: Partial<ControlRun>): Promise<void> {
    const client = await dbPool.connect();
    try {
      const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`);
      const values = Object.values(updates);
      
      await client.query(
        `UPDATE control_runs SET ${fields.join(', ')} WHERE id = $1`,
        [runId, ...values]
      );
    } finally {
      client.release();
    }
  }
}

export const controlsEngine = new ControlsEngine();
