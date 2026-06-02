import { test, expect } from './fixtures/test-fixtures';

test.describe('CMS Reordering API E2E', () => {
  test('should successfully initialize default sections and reorder them without unique constraint issues', async ({ tenantA }) => {
    // 1. Create a new event via API
    const eventSlug = `reorder-e2e-${Date.now()}`;
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
    const initialSections = eventBody.sections;

    // We expect 14 default sections to be initialized automatically
    expect(initialSections).toHaveLength(14);
    
    // Sort orders should be sequential 1..14
    for (let i = 0; i < 14; i++) {
      expect(initialSections[i].sort_order).toBe(i + 1);
    }

    // Pick the 3rd section (index 2) to move to the 1st position (position 1)
    const targetSection = initialSections[2];
    const targetSectionId = targetSection.id;

    // 2. Perform the reorder API call
    const reorderResp = await tenantA.request.put(`/cms/sections/${eventId}/${targetSectionId}/reorder`, {
      data: {
        position: 1,
      },
    });

    expect(reorderResp.status()).toBe(200);
    const reorderBody = await reorderResp.json();
    expect(reorderBody.id).toBe(targetSectionId);
    expect(reorderBody.sort_order).toBe(1);

    // 3. Fetch the updated sections list to verify orders
    const getSectionsResp = await tenantA.request.get(`/cms/sections/${eventId}`);
    expect(getSectionsResp.status()).toBe(200);
    const getSectionsBody = await getSectionsResp.json();
    const updatedSections = getSectionsBody.data;

    expect(updatedSections).toHaveLength(14);

    // The target section should now be at the 1st position (index 0)
    expect(updatedSections[0].id).toBe(targetSectionId);
    expect(updatedSections[0].sort_order).toBe(1);

    // The rest of the sections should have shifted down sequentially
    expect(updatedSections[1].id).toBe(initialSections[0].id);
    expect(updatedSections[1].sort_order).toBe(2);
    expect(updatedSections[2].id).toBe(initialSections[1].id);
    expect(updatedSections[2].sort_order).toBe(3);

    // Verify sort_order constraint: all sort orders should still be sequential 1..14
    for (let i = 0; i < 14; i++) {
      expect(updatedSections[i].sort_order).toBe(i + 1);
    }
  });
});
