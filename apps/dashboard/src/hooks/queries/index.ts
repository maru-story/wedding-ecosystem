import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';

/**
 * Hook to fetch the primary event associated with the current tenant.
 * Automatically identifies if the user is a "new user" (no event found).
 */
export function useEvent() {
  return useQuery({
    queryKey: ['event'],
    queryFn: async () => {
      try {
        return await apiFetch<any>('/events/current');
      } catch (err) {
        // If 404 (RES_5001), it means tenant has no event yet
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    // Don't retry on 404, as it's a valid empty state for new tenants
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    }
  });
}

interface UseGuestsParams {
  page?: number;
  group?: string;
  status?: string;
}

/**
 * Hook to fetch guests for the active event.
 * Integrated with React Query for automatic caching, pagination, filtering, and revalidation.
 */
export function useGuests({ page = 1, group, status }: UseGuestsParams = {}) {
  return useQuery({
    queryKey: ['guests', { page, group, status }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '50',
      });
      if (group) params.set('group', group);
      if (status) params.set('status', status);
      return apiFetch<any>(`/guests?${params.toString()}`);
    },
  });
}

/**
 * Mutation hook to create a new guest.
 */
export function useCreateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch<any>('/guests', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

/**
 * Mutation hook to update an existing guest.
 */
export function useUpdateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      apiFetch<any>(`/guests/${id}`, {
        method: 'PUT',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

/**
 * Mutation hook to delete a guest.
 */
export function useDeleteGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<any>(`/guests/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

/**
 * Hook to fetch realtime statistics for the dashboard.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch<any>('/events/current/stats'),
    // Refetch more frequently for "realtime" feel
    refetchInterval: 30000,
  });
}
