import { test, expect } from './fixtures/test-fixtures';

test.describe('Guests API E2E', () => {
  test('should support full Guest CRUD lifecycle', async ({ tenantA }) => {
    // 1. Create a guest
    const createResponse = await tenantA.request.post('/guests', {
      data: {
        name: 'John Doe',
        group: 'friend',
        type: 'invited',
        phone: '628123456789',
        email: 'johndoe@example.com',
        plus_one_count: 2,
      },
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    expect(createBody.name).toBe('John Doe');
    const guestId = createBody.id;

    // 2. Fetch the created guest
    const getResponse = await tenantA.request.get(`/guests`);
    expect(getResponse.status()).toBe(200);
    const getBody = await getResponse.json();
    const guest = getBody.data.find((g: any) => g.id === guestId);
    expect(guest).toBeDefined();
    expect(guest.name).toBe('John Doe');

    // 3. Update the guest
    const updateResponse = await tenantA.request.put(`/guests/${guestId}`, {
      data: {
        name: 'John Doe Updated',
        group: 'vip',
      },
    });

    expect(updateResponse.status()).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody.name).toBe('John Doe Updated');
    expect(updateBody.group).toBe('vip');

    // 4. Delete the guest
    const deleteResponse = await tenantA.request.delete(`/guests/${guestId}`);
    expect(deleteResponse.status()).toBe(200);

    // 5. Verify guest is deleted
    const verifyResponse = await tenantA.request.get(`/guests`);
    const verifyBody = await verifyResponse.json();
    const deletedGuest = verifyBody.data.find((g: any) => g.id === guestId);
    expect(deletedGuest).toBeUndefined();
  });

  test('should enforce strict tenant isolation', async ({ tenantA, tenantB }) => {
    // Tenant A creates a guest
    const createResponse = await tenantA.request.post('/guests', {
      data: {
        name: 'Tenant A Guest',
        group: 'family',
        phone: '62899999999',
        plus_one_count: 0,
      },
    });
    expect(createResponse.status()).toBe(201);
    const guestId = (await createResponse.json()).id;

    // Tenant B attempts to fetch Tenant A's guest details (should be isolated via tenant context)
    const getResponse = await tenantB.request.get(`/guests/${guestId}/qr`);
    expect(getResponse.status()).toBe(404);

    // Tenant B attempts to update Tenant A's guest
    const updateResponse = await tenantB.request.put(`/guests/${guestId}`, {
      data: { name: 'Hacked name' },
    });
    expect(updateResponse.status()).toBe(404);

    // Tenant B attempts to delete Tenant A's guest
    const deleteResponse = await tenantB.request.delete(`/guests/${guestId}`);
    expect(deleteResponse.status()).toBe(404);
  });

  test('should enforce search query constraint of minimum 3 characters', async ({ tenantA }) => {
    // Try to search with 1 character
    const responseShort = await tenantA.request.get('/guests/search?q=a');
    expect(responseShort.status()).toBe(400);

    // Try to search with 2 characters (should still fail since min is 3)
    const responseTwo = await tenantA.request.get('/guests/search?q=ab');
    expect(responseTwo.status()).toBe(400);

    // Try to search with 3 characters
    const responseValid = await tenantA.request.get('/guests/search?q=abc');
    expect(responseValid.status()).toBe(200);
    const body = await responseValid.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should import guests from CSV correctly', async ({ tenantA }) => {
    const csvContent = 'nama,grup,telepon,email\nAgus Budi,family,628111222333,agus@budi.com\nCici Cantika,vip,628222333444,cici@cantika.com';
    const importResponse = await tenantA.request.post('/guests/import', {
      data: { csv_text: csvContent },
    });

    expect(importResponse.status()).toBe(200);
    const importBody = await importResponse.json();
    expect(importBody.imported).toBe(2);
    expect(importBody.errors).toBe(0);

    // Verify guests exist in the system
    const searchResponse = await tenantA.request.get('/guests/search?q=Agus');
    expect(searchResponse.status()).toBe(200);
    const searchBody = await searchResponse.json();
    expect(searchBody.data.length).toBeGreaterThan(0);
    expect(searchBody.data[0].name).toBe('Agus Budi');
  });

  test('should bulk delete multiple guests', async ({ tenantA }) => {
    // 1. Create two guests
    const guest1Res = await tenantA.request.post('/guests', {
      data: { name: 'Bulk Guest 1', group: 'friend' },
    });
    expect(guest1Res.status()).toBe(201);
    const guest1 = await guest1Res.json();

    const guest2Res = await tenantA.request.post('/guests', {
      data: { name: 'Bulk Guest 2', group: 'friend' },
    });
    expect(guest2Res.status()).toBe(201);
    const guest2 = await guest2Res.json();

    // 2. Perform bulk delete
    const deleteRes = await tenantA.request.post('/guests/bulk-delete', {
      data: { ids: [guest1.id, guest2.id] },
    });
    expect(deleteRes.status()).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);
    expect(deleteBody.deletedCount).toBe(2);

    // 3. Verify they are gone
    const verifyResponse = await tenantA.request.get(`/guests`);
    const verifyBody = await verifyResponse.json();
    const found1 = verifyBody.data.find((g: any) => g.id === guest1.id);
    const found2 = verifyBody.data.find((g: any) => g.id === guest2.id);
    expect(found1).toBeUndefined();
    expect(found2).toBeUndefined();
  });

  test('should enforce tenant isolation during bulk delete', async ({ tenantA, tenantB }) => {
    // Tenant A creates a guest
    const guestRes = await tenantA.request.post('/guests', {
      data: { name: 'Tenant A Guest for Bulk', group: 'family' },
    });
    expect(guestRes.status()).toBe(201);
    const guestId = (await guestRes.json()).id;

    // Tenant B attempts to bulk delete Tenant A's guest
    const deleteRes = await tenantB.request.post('/guests/bulk-delete', {
      data: { ids: [guestId] },
    });
    expect(deleteRes.status()).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);
    expect(deleteBody.deletedCount).toBe(0); // 0 deleted because it belongs to Tenant A

    // Verify it still exists for Tenant A
    const verifyRes = await tenantA.request.get(`/guests`);
    const verifyBody = await verifyRes.json();
    const found = verifyBody.data.find((g: any) => g.id === guestId);
    expect(found).toBeDefined();

    // Clean up
    await tenantA.request.delete(`/guests/${guestId}`);
  });
});
