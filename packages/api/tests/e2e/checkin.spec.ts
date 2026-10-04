import { test, expect } from './fixtures/test-fixtures';

test.describe('Check-in API E2E', () => {
  test('should support QR scan check-in and handle duplicates correctly', async ({ tenantA }) => {
    // 1. Create a guest
    const guestResponse = await tenantA.request.post('/guests', {
      data: {
        name: 'Jane Doe',
        group: 'vip',
        plus_one_count: 0,
      },
    });
    expect(guestResponse.status()).toBe(201);
    const guest = await guestResponse.json();
    const guestId = guest.id;

    // 2. Fetch the guest QR payload
    const qrResponse = await tenantA.request.get(`/guests/${guestId}/qr`);
    expect(qrResponse.status()).toBe(200);
    const qrData = await qrResponse.json();
    const qrPayload = qrData.qr_payload;
    expect(qrPayload).not.toBeNull();
    expect(qrPayload).toMatch(/^w_[0-9a-f]{16}$/);

    // 3. Perform first scan (GREEN)
    const scan1Response = await tenantA.request.post('/checkin/scan', {
      data: {
        qr_payload: qrPayload,
        event_id: tenantA.eventId,
      },
    });
    expect(scan1Response.status()).toBe(200);
    const scan1Body = await scan1Response.json();
    expect(scan1Body.status).toBe('green');
    expect(scan1Body.checked_in_at).not.toBeNull();

    // 4. Perform second scan (GREEN - Bypass duplicate scan and increment count)
    const scan2Response = await tenantA.request.post('/checkin/scan', {
      data: {
        qr_payload: qrPayload,
        event_id: tenantA.eventId,
      },
    });
    expect(scan2Response.status()).toBe(200);
    const scan2Body = await scan2Response.json();
    expect(scan2Body.status).toBe('green');
    expect(scan2Body.scan_count).toBe(2);
    expect(scan2Body.checked_in_at).not.toBeNull();
  });

  test('should register a Go-Show (walk-in) guest and check them in', async ({ tenantA }) => {
    const response = await tenantA.request.post('/checkin/go-show', {
      data: {
        name: 'Walk-In Guest',
        event_id: tenantA.eventId,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.guest_id).toBeDefined();
    expect(body.guest_name).toBe('Walk-In Guest');
    expect(body.checked_in_at).not.toBeNull();
  });

  test('should check in a guest manually using guest_id', async ({ tenantA }) => {
    // 1. Create a guest
    const guestResponse = await tenantA.request.post('/guests', {
      data: {
        name: 'Manual Checkin Guest',
        group: 'family',
        plus_one_count: 0,
      },
    });
    expect(guestResponse.status()).toBe(201);
    const guestId = (await guestResponse.json()).id;

    // 2. Perform manual check-in
    const checkinResponse = await tenantA.request.post('/checkin/manual', {
      data: {
        guest_id: guestId,
        event_id: tenantA.eventId,
      },
    });

    expect(checkinResponse.status()).toBe(200);
    const body = await checkinResponse.json();
    expect(body.success).toBe(true);
    expect(body.guest_name).toBe('Manual Checkin Guest');
    expect(body.checked_in_at).not.toBeNull();

    // 3. Attempt duplicate manual check-in (should succeed and increment scan count)
    const duplicateResponse = await tenantA.request.post('/checkin/manual', {
      data: {
        guest_id: guestId,
        event_id: tenantA.eventId,
      },
    });
    expect(duplicateResponse.status()).toBe(200);
    const duplicateBody = await duplicateResponse.json();
    expect(duplicateBody.success).toBe(true);
    expect(duplicateBody.scan_count).toBe(2);
    expect(duplicateBody.checked_in_at).not.toBeNull();
  });

  test('should sync offline check-in records including regular and go-show check-ins', async ({
    tenantA,
  }) => {
    // 1. Create a guest for regular check-in
    const guestResponse = await tenantA.request.post('/guests', {
      data: {
        name: 'Offline Sync Guest',
        group: 'friend',
        plus_one_count: 0,
      },
    });
    expect(guestResponse.status()).toBe(201);
    const guestId = (await guestResponse.json()).id;

    // 2. Submit batch sync containing regular guest and go-show guest
    const syncResponse = await tenantA.request.post('/checkin/sync', {
      data: {
        records: [
          {
            guest_id: guestId,
            event_id: tenantA.eventId,
            method: 'qr_scan',
            checked_in_at: new Date('2026-10-04T08:00:00.000Z').toISOString(),
          },
          {
            guest_id: 'temp-offline-goshow-999',
            guest_name: 'Walk-in Offline Guest',
            event_id: tenantA.eventId,
            method: 'go_show',
            checked_in_at: new Date('2026-10-04T08:05:00.000Z').toISOString(),
          },
        ],
      },
    });

    expect(syncResponse.status()).toBe(200);
    const syncBody = await syncResponse.json();
    expect(syncBody.success).toBe(true);
    expect(syncBody.total).toBe(2);
    expect(syncBody.synced).toBe(2);
    expect(syncBody.errors).toBe(0);
  });
});
