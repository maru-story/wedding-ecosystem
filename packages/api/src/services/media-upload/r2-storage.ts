import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CloudStorage } from './media-upload.service';
import { getStorageConfig, createR2Client, StorageConfig } from '../storage/storage';

export class R2CloudStorage implements CloudStorage {
  private readonly s3Client: S3Client;
  private readonly config: StorageConfig;

  constructor(s3Client: S3Client, config: StorageConfig) {
    this.s3Client = s3Client;
    this.config = config;
  }

  async upload(buffer: Buffer, key: string, mimetype: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    });

    await this.s3Client.send(command);

    return this.config.publicUrl ? `${this.config.publicUrl}/${key}` : key;
  }
}

export class MockCloudStorage implements CloudStorage {
  async upload(_buffer: Buffer, key: string, _mimetype: string): Promise<string> {
    return `/uploads/mock-${key}`;
  }
}

/**
 * Creates a CloudStorage instance.
 * Reuses R2 config if present. In development, falls back to MockCloudStorage if configuration is missing.
 */
export function createCloudStorage(): CloudStorage {
  const config = getStorageConfig();
  if (!config) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw new Error(
        'R2 configuration is required in production environment (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).'
      );
    }
    console.warn(
      '[R2CloudStorage] R2 configuration not set. Falling back to MockCloudStorage in development.'
    );
    return new MockCloudStorage();
  }

  const s3Client = createR2Client(config);
  return new R2CloudStorage(s3Client, config);
}
