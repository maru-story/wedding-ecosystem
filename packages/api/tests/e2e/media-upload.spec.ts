import { test, expect } from './fixtures/test-fixtures';

test.describe('Media Upload API E2E', () => {
  test('should upload image successfully and organize path based on slugs and section', async ({
    tenantA,
  }) => {
    const response = await tenantA.request.post(
      `/events/${tenantA.eventId}/media/upload?section=cover`,
      {
        multipart: {
          file: {
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image-data-here-must-be-some-bytes-long-enough-to-be-buffer'),
          },
        },
      }
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.url).toBeDefined();
    expect(body.data.url).toBe(body.url);
    expect(body.data.originalname).toBe('photo.jpg');
    expect(body.data.mimetype).toBe('image/jpeg');
    expect(body.data.category).toBe('image');

    // Verify organized directory path
    expect(body.url).toContain('tenant-a-');
    expect(body.url).toContain('event-a-');
    expect(body.url).toContain('/cms/cover/');
  });

  test('should fail upload with unsupported file type', async ({ tenantA }) => {
    const response = await tenantA.request.post(`/events/${tenantA.eventId}/media/upload`, {
      multipart: {
        file: {
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('fake-pdf-data'),
        },
      },
    });

    expect(response.status()).toBe(415);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UPLOAD_10002');
  });

  test('should fail if event does not belong to tenant', async ({ tenantA, tenantB }) => {
    const response = await tenantA.request.post(`/events/${tenantB.eventId}/media/upload`, {
      multipart: {
        file: {
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-image-data'),
        },
      },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RES_5001');
  });

  test('should fail if no file is provided', async ({ tenantA }) => {
    const response = await tenantA.request.post(`/events/${tenantA.eventId}/media/upload`, {
      headers: {
        // Send a post without multipart boundary
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
      },
      data: '',
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
