import { test, expect } from './fixtures/test-fixtures';
import { io } from 'socket.io-client';

test.describe('Real-time Socket.io API E2E', () => {
  test('should broadcast check-in updates to event rooms', async ({ tenantA }) => {
    // 1. Establish socket client connection targeting the E2E test server port 4005
    const socket = io('http://localhost:4005', {
      auth: {
        token: tenantA.token,
      },
      transports: ['websocket'],
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timed out')), 5000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // 2. Join the event room
    socket.emit('join_event', tenantA.eventId);

    // 3. Set up event listener for guest_checked_in
    const checkedInPromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket event timed out')), 5000);
      socket.on('guest_checked_in', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });

    // 4. Create a guest and check them in via REST request
    const guestResponse = await tenantA.request.post('/guests', {
      data: {
        name: 'Realtime Guest',
        group: 'friend',
        plus_one_count: 0,
      },
    });
    expect(guestResponse.status()).toBe(201);
    const guest = await guestResponse.json();

    const checkinResponse = await tenantA.request.post('/checkin/manual', {
      data: {
        guest_id: guest.id,
        event_id: tenantA.eventId,
      },
    });
    expect(checkinResponse.status()).toBe(200);

    // 5. Assert check-in event was broadcasted to client
    const eventData = await checkedInPromise;
    expect(eventData.guest_id).toBe(guest.id);
    expect(eventData.guest_name).toBe('Realtime Guest');

    // Clean up connection
    socket.disconnect();
  });

  test('should broadcast check-in updates specifically to guest private room', async ({ tenantA }) => {
    // 1. Create a guest first
    const guestResponse = await tenantA.request.post('/guests', {
      data: {
        name: 'Guest Room Realtime',
        group: 'friend',
        plus_one_count: 0,
      },
    });
    expect(guestResponse.status()).toBe(201);
    const guest = await guestResponse.json();

    // 2. Establish a guest socket client connection using the guest authentication bypass
    const socket = io('http://localhost:4005', {
      auth: {
        type: 'guest',
        guestId: guest.id,
      },
      transports: ['websocket'],
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Guest connection timed out')), 5000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // 3. Set up event listener for guest_checked_in on guest room
    const checkedInPromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Guest WebSocket event timed out')), 5000);
      socket.on('guest_checked_in', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });

    // 4. Perform check-in via REST request
    const checkinResponse = await tenantA.request.post('/checkin/manual', {
      data: {
        guest_id: guest.id,
        event_id: tenantA.eventId,
      },
    });
    expect(checkinResponse.status()).toBe(200);

    // 5. Assert check-in event was broadcasted to the guest's private room
    const eventData = await checkedInPromise;
    expect(eventData.guest_id).toBe(guest.id);
    expect(eventData.guest_name).toBe('Guest Room Realtime');

    // Clean up connection
    socket.disconnect();
  });
});
