import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { R2CloudStorage, MockCloudStorage, createCloudStorage } from './r2-storage';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getStorageConfig } from '../storage/storage';

// --- Mocks ---
vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn().mockResolvedValue({});
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

vi.mock('../storage/storage', () => {
  const mockCreateR2Client = vi.fn().mockImplementation((config) => {
    return new S3Client(config);
  });
  return {
    getStorageConfig: vi.fn(),
    createR2Client: mockCreateR2Client,
  };
});

describe('R2CloudStorage', () => {
  const mockConfig = {
    accountId: 'test-account',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    bucketName: 'test-bucket',
    publicUrl: 'https://cdn.example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload a buffer to R2 and return the CDN public URL', async () => {
    const s3Client = new S3Client({});
    const storage = new R2CloudStorage(s3Client, mockConfig);

    const buffer = Buffer.from('test-data');
    const key = 'tenant-1/event-2/media/photo.jpg';
    const mimetype = 'image/jpeg';

    const result = await storage.upload(buffer, key, mimetype);

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    });
    expect(s3Client.send).toHaveBeenCalled();
    expect(result).toBe('https://cdn.example.com/tenant-1/event-2/media/photo.jpg');
  });

  it('should fallback to returning key if publicUrl is not set', async () => {
    const s3Client = new S3Client({});
    const storage = new R2CloudStorage(s3Client, { ...mockConfig, publicUrl: '' });

    const buffer = Buffer.from('test-data');
    const key = 'tenant-1/event-2/media/photo.jpg';
    const mimetype = 'image/jpeg';

    const result = await storage.upload(buffer, key, mimetype);

    expect(result).toBe('tenant-1/event-2/media/photo.jpg');
  });
});

describe('MockCloudStorage', () => {
  it('should return simulated mock URL', async () => {
    const storage = new MockCloudStorage();
    const result = await storage.upload(Buffer.from(''), 'tenant-1/event-2/media/photo.jpg', 'image/jpeg');
    expect(result).toBe('/uploads/mock-tenant-1/event-2/media/photo.jpg');
  });
});

describe('createCloudStorage factory', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should create R2CloudStorage when configuration is set', () => {
    vi.mocked(getStorageConfig).mockReturnValue({
      accountId: 'test-account',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      bucketName: 'test-bucket',
      publicUrl: 'https://cdn.example.com',
    });

    const storage = createCloudStorage();
    expect(storage).toBeInstanceOf(R2CloudStorage);
  });

  it('should create MockCloudStorage when configuration is missing in development', () => {
    process.env.NODE_ENV = 'development';
    vi.mocked(getStorageConfig).mockReturnValue(null);

    const storage = createCloudStorage();
    expect(storage).toBeInstanceOf(MockCloudStorage);
  });

  it('should throw error when configuration is missing in production', () => {
    process.env.NODE_ENV = 'production';
    vi.mocked(getStorageConfig).mockReturnValue(null);

    expect(() => createCloudStorage()).toThrowError(/R2 configuration is required/);
  });
});
