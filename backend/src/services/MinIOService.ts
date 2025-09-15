import { Client } from "minio";
import { v4 as uuidv4 } from "uuid";
import { minioConfig } from "../config/database";
import { FileUploadResult } from "../types";

export class MinIOService {
  private client: Client;
  private bucketName: string;

  constructor() {
    this.client = new Client(minioConfig);
    // ensure a definite string; use env or default
    this.bucketName = process.env.MINIO_BUCKET ?? "compliance-pilot";
  }

  async initialize(): Promise<void> {
    try {
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName, "us-east-1");
        console.log(`✅ MinIO bucket '${this.bucketName}' created`);
      } else {
        console.log(`✅ MinIO bucket '${this.bucketName}' exists`);
      }
    } catch (error: unknown) {
      console.error(
        "❌ MinIO initialization failed:",
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    tenantId: string,
    datasetType: string,
    contentType: string = "application/octet-stream"
  ): Promise<FileUploadResult> {
    try {
      const fileId = uuidv4();
      const date = new Date().toISOString().split("T")[0];
      const objectName = `${tenantId}/${datasetType}/${date}/${fileId}_${filename}`;

      await this.client.putObject(this.bucketName, objectName, file, file.length, {
        "Content-Type": contentType,
        "X-Tenant-ID": tenantId,
        "X-Dataset-Type": datasetType,
        "X-Upload-Date": new Date().toISOString(),
      });

      return {
        file_id: fileId,
        filename,
        size: file.length,
        hash: this.generateHash(file),
        path: objectName,
        uploaded_at: new Date(),
      };
    } catch (error: unknown) {
      console.error("File upload failed:", error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });
    } catch (error: unknown) {
      console.error("File download failed:", error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
    } catch (error: unknown) {
      console.error("File deletion failed:", error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getFileUrl(objectName: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.client.presignedGetObject(this.bucketName, objectName, expiresIn);
    } catch (error: unknown) {
      console.error("Failed to generate file URL:", error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to generate file URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listFiles(tenantId: string, prefix?: string): Promise<string[]> {
    try {
      const objects: string[] = [];
      const stream = this.client.listObjects(this.bucketName, `${tenantId}/${prefix ?? ""}`, true);

      return new Promise((resolve, reject) => {
        stream.on("data", (obj: any) => objects.push(obj.name as string));
        stream.on("end", () => resolve(objects));
        stream.on("error", reject);
      });
    } catch (error: unknown) {
      console.error("Failed to list files:", error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateHash(buffer: Buffer): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucketName);
      return true;
    } catch (error: unknown) {
      console.error("MinIO health check failed:", error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

export const minioService = new MinIOService();
