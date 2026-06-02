'use client';

import { useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useRsvpStats, useRsvpList } from './queries';

/** Real-time event statistics (Req 9.6) */
export interface EventStats {
  total_guests: number;
  total_rsvp: number;
  total_checked_in: number;
  total_go_show: number;
}

/** RSVP record for tracking display (Req 4.8) */
export interface RsvpTrackingItem {
  guest_id: string;
  guest_name: string;
  attendance: 'akad' | 'resepsi' | 'both' | 'decline';
  guest_count: number;
  submitted_at: string;
  group?: string;
  phone?: string | null;
  delivery_status?: string;
}

interface UseRealtimeStatsOptions {
  socket: Socket | null;
  eventId: string | null;
}

interface UseRealtimeStatsReturn {
  stats: EventStats;
  rsvpList: RsvpTrackingItem[];
}

const DEFAULT_STATS: EventStats = {
  total_guests: 0,
  total_rsvp: 0,
  total_checked_in: 0,
  total_go_show: 0,
};

/**
 * Hook for receiving real-time statistics and RSVP updates via WebSocket.
 * Updates stats within < 500ms after broadcast received (Req 9.6) via TanStack Query cache.
 */
export function useRealtimeStats({
  socket,
  eventId,
}: UseRealtimeStatsOptions): UseRealtimeStatsReturn {
  const queryClient = useQueryClient();

  const { data: stats = DEFAULT_STATS } = useRsvpStats(eventId);
  const { data: rsvpResponse } = useRsvpList(eventId);
  const rsvpList = rsvpResponse?.data || [];

  const handleStatsUpdated = useCallback((payload: EventStats) => {
    queryClient.setQueryData(['rsvp-stats', eventId], payload);
  }, [queryClient, eventId]);

  const handleRsvpUpdated = useCallback((payload: RsvpTrackingItem) => {
    queryClient.setQueryData<{ data: RsvpTrackingItem[] }>(['rsvp-list', eventId], (prev) => {
      const prevData = prev?.data || [];
      const existingIndex = prevData.findIndex((item) => item.guest_id === payload.guest_id);
      let updatedData = [...prevData];
      if (existingIndex >= 0) {
        updatedData[existingIndex] = payload;
      } else {
        updatedData = [payload, ...updatedData];
      }
      return { data: updatedData };
    });
  }, [queryClient, eventId]);

  const handleGoShowAdded = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['rsvp-stats', eventId] });
    queryClient.invalidateQueries({ queryKey: ['rsvp-list', eventId] });
  }, [queryClient, eventId]);

  const handleGuestCheckedIn = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['rsvp-stats', eventId] });
  }, [queryClient, eventId]);

  useEffect(() => {
    if (!socket || !eventId) return;

    socket.on('stats_updated', handleStatsUpdated);
    socket.on('rsvp_updated', handleRsvpUpdated);
    socket.on('go_show_added', handleGoShowAdded);
    socket.on('guest_checked_in', handleGuestCheckedIn);

    return () => {
      socket.off('stats_updated', handleStatsUpdated);
      socket.off('rsvp_updated', handleRsvpUpdated);
      socket.off('go_show_added', handleGoShowAdded);
      socket.off('guest_checked_in', handleGuestCheckedIn);
    };
  }, [socket, eventId, handleStatsUpdated, handleRsvpUpdated, handleGoShowAdded, handleGuestCheckedIn]);

  return { stats, rsvpList };
}
