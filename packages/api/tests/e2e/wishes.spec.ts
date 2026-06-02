import { test, expect } from './fixtures/test-fixtures';

test.describe('Wishes API E2E', () => {
  test('should support full Wish visibility toggle and delete lifecycle with admin access', async ({ tenantA, tenantB }) => {
    // 1. Create a new event for Tenant A to ensure sections and data are clean
    const eventSlug = `wishes-e2e-${Date.now()}`;
    const createEventResp = await tenantA.request.post('/events', {
      data: {
        slug: eventSlug,
        bride_name: 'Juliet',
        groom_name: 'Romeo',
        event_date: '2026-10-10T10:00:00.000Z',
        venue_name: 'Verona Palace',
        venue_address: 'Verona Street No. 12',
        venue_maps_url: 'https://maps.google.com',
        akad_start: '08:00',
        akad_end: '10:00',
        resepsi_start: '11:00',
        resepsi_end: '14:00',
      },
    });

    expect(createEventResp.status()).toBe(201);
    const eventBody = await createEventResp.json();
    const eventId = eventBody.event.id;

    // 2. Submit a message publicly (no auth required)
    const submitResp = await tenantA.request.post('/messages', {
      data: {
        event_id: eventId,
        sender_name: 'Alice',
        message_text: 'Selamat menempuh hidup baru!',
      },
    });
    expect(submitResp.status()).toBe(201);
    const message = await submitResp.json();
    expect(message.sender_name).toBe('Alice');
    expect(message.is_visible).toBe(true);
    const messageId = message.id;

    // 3. Verify it shows up in the public list
    const publicListResp = await tenantA.request.get(`/messages/${eventId}`);
    expect(publicListResp.status()).toBe(200);
    const publicList = await publicListResp.json();
    expect(publicList.data.find((m: any) => m.id === messageId)).toBeDefined();

    // 4. Fetch the admin wishes list (auth required)
    const adminListResp = await tenantA.request.get(`/messages/${eventId}/admin`);
    expect(adminListResp.status()).toBe(200);
    const adminList = await adminListResp.json();
    const adminWish = adminList.data.find((m: any) => m.id === messageId);
    expect(adminWish).toBeDefined();
    expect(adminWish.is_visible).toBe(true);

    // 5. Verify tenant isolation: Tenant B cannot access Tenant A's admin wishes
    const tenantBAdminResp = await tenantB.request.get(`/messages/${eventId}/admin`);
    expect(tenantBAdminResp.status()).toBe(404); // returns 404 Event tidak ditemukan

    // 6. Toggle visibility to false (hide it)
    const toggleHideResp = await tenantA.request.put(`/messages/${messageId}/visibility`, {
      data: {
        is_visible: false,
      },
    });
    expect(toggleHideResp.status()).toBe(200);
    const hiddenMessage = await toggleHideResp.json();
    expect(hiddenMessage.is_visible).toBe(false);

    // 7. Verify tenant B cannot toggle Tenant A's wish visibility
    const tenantBToggleResp = await tenantB.request.put(`/messages/${messageId}/visibility`, {
      data: {
        is_visible: true,
      },
    });
    expect(tenantBToggleResp.status()).toBe(404); // returns 404 Ucapan tidak ditemukan

    // 8. Verify it is hidden from the public list
    const publicListHiddenResp = await tenantA.request.get(`/messages/${eventId}`);
    expect(publicListHiddenResp.status()).toBe(200);
    const publicListHidden = await publicListHiddenResp.json();
    expect(publicListHidden.data.find((m: any) => m.id === messageId)).toBeUndefined();

    // 9. Verify it is still visible in the admin list
    const adminListHiddenResp = await tenantA.request.get(`/messages/${eventId}/admin`);
    expect(adminListHiddenResp.status()).toBe(200);
    const adminListHidden = await adminListHiddenResp.json();
    const adminWishHidden = adminListHidden.data.find((m: any) => m.id === messageId);
    expect(adminWishHidden).toBeDefined();
    expect(adminWishHidden.is_visible).toBe(false);

    // 10. Delete the message (auth required)
    const deleteResp = await tenantA.request.delete(`/messages/${messageId}`);
    expect(deleteResp.status()).toBe(200);

    // 11. Verify deleted
    const adminListDeletedResp = await tenantA.request.get(`/messages/${eventId}/admin`);
    expect(adminListDeletedResp.status()).toBe(200);
    const adminListDeleted = await adminListDeletedResp.json();
    expect(adminListDeleted.data.find((m: any) => m.id === messageId)).toBeUndefined();
  });
});
