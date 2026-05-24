import { describe, it, expect, vi, beforeEach } from 'vitest';

// Declare mock functions with 'mock' prefix so they are hoisted and accessible in vi.mock
const mockUseEffect = vi.fn().mockImplementation((effect) => {
  (mockUseEffect as any).cleanup = effect() || undefined;
});

vi.mock('react', async (importActual) => {
  const actual = await importActual<typeof import('react')>();
  return {
    ...actual,
    useEffect: (effect: any, deps: any) => mockUseEffect(effect, deps),
    useCallback: (fn: any) => fn,
  };
});

import { useRealtimeStats, type EventStats, type RsvpTrackingItem } from './use-realtime-stats';

// Mock TanStack query client and hooks
const mockQueryClient = {
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
};

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}));

vi.mock('./queries', () => ({
  useRsvpStats: vi.fn(() => ({
    data: { total_guests: 10, total_rsvp: 5, total_checked_in: 3, total_go_show: 1 },
  })),
  useRsvpList: vi.fn(() => ({
    data: { data: [] },
  })),
}));

// Mock a minimal Socket-like event emitter for testing
class MockSocket {
  on = vi.fn();
  off = vi.fn();
  emit = vi.fn();

  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor() {
    this.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)!.add(handler);
    });

    this.off.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      this.listeners.get(event)?.delete(handler);
    });

    this.emit.mockImplementation((event: string, ...args: any[]) => {
      this.listeners.get(event)?.forEach((handler) => handler(...args));
    });
  }
}

describe('useRealtimeStats hook tests', () => {
  let mockSocket: MockSocket;
  const eventId = 'test-event-id';

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryClient.setQueryData.mockReset();
    mockQueryClient.invalidateQueries.mockReset();
    mockSocket = new MockSocket();
    (mockUseEffect as any).cleanup = undefined;
  });

  it('should register socket event listeners on mount and return stats & rsvpList', () => {
    const { stats, rsvpList } = useRealtimeStats({ socket: mockSocket as any, eventId });

    expect(mockSocket.on).toHaveBeenCalledWith('stats_updated', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('rsvp_updated', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('go_show_added', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('guest_checked_in', expect.any(Function));

    expect(stats).toEqual({ total_guests: 10, total_rsvp: 5, total_checked_in: 3, total_go_show: 1 });
    expect(rsvpList).toEqual([]);
  });

  it('should remove socket event listeners on unmount', () => {
    useRealtimeStats({ socket: mockSocket as any, eventId });
    const cleanup = (mockUseEffect as any).cleanup;
    expect(cleanup).toBeDefined();

    if (cleanup) {
      cleanup();
    }

    expect(mockSocket.off).toHaveBeenCalledWith('stats_updated', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('rsvp_updated', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('go_show_added', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('guest_checked_in', expect.any(Function));
  });

  it('should update stats cache when stats_updated event is received', () => {
    useRealtimeStats({ socket: mockSocket as any, eventId });

    const newStats: EventStats = {
      total_guests: 100,
      total_rsvp: 50,
      total_checked_in: 30,
      total_go_show: 5,
    };

    mockSocket.emit('stats_updated', newStats);

    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(['rsvp-stats', eventId], newStats);
  });

  it('should update rsvp-list cache (upsert) when rsvp_updated event is received', () => {
    useRealtimeStats({ socket: mockSocket as any, eventId });

    const rsvpItem: RsvpTrackingItem = {
      guest_id: 'guest-1',
      guest_name: 'Budi Santoso',
      attendance: 'both',
      guest_count: 2,
      submitted_at: '2025-01-15T10:00:00Z',
    };

    mockSocket.emit('rsvp_updated', rsvpItem);

    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      ['rsvp-list', eventId],
      expect.any(Function)
    );

    // Test the updater callback logic
    const updater = mockQueryClient.setQueryData.mock.calls[0][1] as (old: any) => any;
    
    // Case 1: Initial empty list
    const result1 = updater({ data: [] });
    expect(result1).toEqual({ data: [rsvpItem] });

    // Case 2: Update existing item
    const result2 = updater({ data: [rsvpItem] });
    expect(result2.data).toHaveLength(1);
    expect(result2.data[0]).toEqual(rsvpItem);

    // Case 3: Insert new item into list with existing item
    const otherItem: RsvpTrackingItem = {
      guest_id: 'guest-2',
      guest_name: 'Siti Rahayu',
      attendance: 'akad',
      guest_count: 1,
      submitted_at: '2025-01-15T11:00:00Z',
    };
    const result3 = updater({ data: [otherItem] });
    expect(result3.data).toHaveLength(2);
    expect(result3.data[0]).toEqual(rsvpItem); // Newest is prepended
    expect(result3.data[1]).toEqual(otherItem);
  });

  it('should invalidate stats and list queries when go_show_added event is received', () => {
    useRealtimeStats({ socket: mockSocket as any, eventId });

    mockSocket.emit('go_show_added');

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['rsvp-stats', eventId],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['rsvp-list', eventId],
    });
  });

  it('should invalidate stats queries when guest_checked_in event is received', () => {
    useRealtimeStats({ socket: mockSocket as any, eventId });

    mockSocket.emit('guest_checked_in');

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['rsvp-stats', eventId],
    });
  });
});
