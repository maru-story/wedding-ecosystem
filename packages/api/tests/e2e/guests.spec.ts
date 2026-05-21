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
    expect(createBody.data.name).toBe('John Doe');
    const guestId = createBody.data.id;

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
    expect(updateBody.data.name).toBe('John Doe Updated');
    expect(updateBody.data.group).toBe('vip');

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
    const guestId = (await createResponse.json()).data.id;

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

  test('should enforce search query constraint of minimum 2 characters', async ({ tenantA }) => {
    // Try to search with 1 character
    const responseShort = await tenantA.request.get('/guests/search?q=a');
    expect(responseShort.status()).toBe(400);

    // Try to search with 2 characters
    const responseValid = await tenantA.request.get('/guests/search?q=ab');
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
});
