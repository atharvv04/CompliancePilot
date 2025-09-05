import { Client } from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { minioConfig } from '../config/database';
import { FileUploadResult } from '../types';

export class MinIOService {
  private client: Client;
  private bucketName: string;

  constructor() {
    this.client = new Client(minioConfig);
    this.bucketName = 'compliance-pilot';
  }

  async initialize(): Promise<void> {
    try {
      // Check if bucket exists, create if not
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        console.log(`✅ MinIO bucket '${this.bucketName}' created`);
      } else {
        console.log(`✅ MinIO bucket '${this.bucketName}' exists`);
      }
    } catch (error) {
      console.error('❌ MinIO initialization failed:', error);
      throw error;
    }
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    tenantId: string,
    datasetType: string,
    contentType: string = 'application/octet-stream'
  ): Promise<FileUploadResult> {
    try {
      const fileId = uuidv4();
      const date = new Date().toISOString().split('T')[0];
      const objectName = `${tenantId}/${datasetType}/${date}/${fileId}_${filename}`;

      await this.client.putObject(
        this.bucketName,
        objectName,
        file,
        file.length,
        {
          'Content-Type': contentType,
          'X-Tenant-ID': tenantId,
          'X-Dataset-Type': datasetType,
          'X-Upload-Date': new Date().toISOString(),
        }
      );

      return {
        file_id: fileId,
        filename,
        size: file.length,
        hash: this.generateHash(file),
        path: objectName,
        uploaded_at: new Date(),
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('File download failed:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
    } catch (error) {
      console.error('File deletion failed:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileUrl(objectName: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.client.presignedGetObject(this.bucketName, objectName, expiresIn);
    } catch (error) {
      console.error('Failed to generate file URL:', error);
      throw new Error(`Failed to generate file URL: ${error.message}`);
    }
  }

  async listFiles(tenantId: string, prefix?: string): Promise<string[]> {
    try {
      const objects: string[] = [];
      const stream = this.client.listObjects(this.bucketName, `${tenantId}/${prefix || ''}`, true);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => objects.push(obj.name));
        stream.on('end', () => resolve(objects));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Failed to list files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  private generateHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucketName);
      return true;
    } catch (error) {
      console.error('MinIO health check failed:', error);
      return false;
    }
  }
}

export const minioService = new MinIOService();
