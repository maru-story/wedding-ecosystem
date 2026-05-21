import { test, expect } from './fixtures/test-fixtures';

test.describe('Scanner API E2E', () => {
  test('should enforce maximum of 2 active scanner devices per event', async ({ tenantA }) => {
    // 1. Register device 1
    const response1 = await tenantA.request.post('/scanner/devices/register', {
      data: {
        event_id: tenantA.eventId,
        device_name: 'Device 1',
        lane: 'lane_1',
      },
    });
    expect(response1.status()).toBe(201);
    const device1 = await response1.json();
    expect(device1.id).toBeDefined();

    // 2. Register device 2
    const response2 = await tenantA.request.post('/scanner/devices/register', {
      data: {
        event_id: tenantA.eventId,
        device_name: 'Device 2',
        lane: 'lane_2',
      },
    });
    expect(response2.status()).toBe(201);
    const device2 = await response2.json();
    expect(device2.id).toBeDefined();

    // 3. Attempt to register device 3 (should fail due to max capacity rule)
    const response3 = await tenantA.request.post('/scanner/devices/register', {
      data: {
        event_id: tenantA.eventId,
        device_name: 'Device 3',
        lane: 'lane_1',
      },
    });
    expect(response3.status()).toBe(403);
    const body3 = await response3.json();
    expect(body3.success).toBe(false);
    expect(body3.error.code).toBe('SCANNER_7001');

    // 4. Deactivate device 1
    const deactivateResponse = await tenantA.request.delete(`/scanner/devices/${device1.id}`);
    expect(deactivateResponse.status()).toBe(200);

    // 5. Register device 3 again (should now succeed since device 1 was deactivated)
    const response3Retry = await tenantA.request.post('/scanner/devices/register', {
      data: {
        event_id: tenantA.eventId,
        device_name: 'Device 3',
        lane: 'lane_1',
      },
    });
    expect(response3Retry.status()).toBe(201);
  });
});
