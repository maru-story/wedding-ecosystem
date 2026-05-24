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

/**
 * Hook to fetch global statistics for system admins.
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch<{ success: boolean; data: any }>('/admin/stats'),
  });
}

/**
 * Hook to fetch paginated tenants for system admins.
 */
export function useAdminTenants({
  page = 1,
  perPage = 10,
  planType = 'ALL',
}: {
  page?: number;
  perPage?: number;
  planType?: string;
} = {}) {
  return useQuery({
    queryKey: ['admin-tenants', { page, perPage, planType }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (planType !== 'ALL') {
        params.set('plan_type', planType);
      }
      return apiFetch<any>(`/admin/tenants?${params.toString()}`);
    },
  });
}

/**
 * Mutation hook to create a new tenant.
 */
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch<{ success: boolean; data: any }>('/admin/tenants', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

/**
 * Mutation hook to toggle a tenant's active/inactive status.
 */
export function useToggleTenantStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, isActive }: { tenantId: string; isActive: boolean }) =>
      apiFetch<{ success: boolean; data: any }>(`/admin/tenants/${tenantId}/status`, {
        method: 'PATCH',
        body: { is_active: isActive },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
  });
}

/**
 * Hook to fetch users across the platform.
 */
export function useAdminUsers({
  page = 1,
  perPage = 10,
  role = 'ALL',
}: {
  page?: number;
  perPage?: number;
  role?: string;
} = {}) {
  return useQuery({
    queryKey: ['admin-users', { page, perPage, role }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (role !== 'ALL') {
        params.set('role', role);
      }
      return apiFetch<any>(`/admin/users?${params.toString()}`);
    },
  });
}

/**
 * Mutation hook to reset a user's password.
 */
export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password?: string }) =>
      apiFetch<{ success: boolean; message: string }>(`/admin/users/${userId}/reset-password`, {
        method: 'PUT',
        body: { password },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

/**
 * Hook to fetch system audit logs.
 */
export function useAdminAuditLogs({
  page = 1,
  search = '',
  action = 'ALL',
  tenantId = 'ALL',
  userId = 'ALL',
}: {
  page?: number;
  search?: string;
  action?: string;
  tenantId?: string;
  userId?: string;
} = {}) {
  return useQuery({
    queryKey: ['admin-audit-logs', { page, search, action, tenantId, userId }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '10',
      });
      if (search) params.set('search', search);
      if (action !== 'ALL') params.set('action', action);
      if (tenantId !== 'ALL') params.set('tenant_id', tenantId);
      if (userFilterKey(userId) !== 'ALL') params.set('user_id', userId);
      return apiFetch<any>(`/admin/audit-logs?${params.toString()}`);
    },
  });
}

function userFilterKey(userId: string) {
  return userId;
}

/**
 * Hook to fetch RSVP statistics for an event.
 */
export function useRsvpStats(eventId?: string | null) {
  return useQuery({
    queryKey: ['rsvp-stats', eventId],
    queryFn: () => apiFetch<any>(`/events/${eventId}/stats`),
    enabled: !!eventId,
  });
}

/**
 * Hook to fetch the full RSVP list for an event.
 */
export function useRsvpList(eventId?: string | null) {
  return useQuery({
    queryKey: ['rsvp-list', eventId],
    queryFn: () => apiFetch<{ data: any[] }>(`/events/${eventId}/rsvp`),
    enabled: !!eventId,
  });
}

/**
 * Hook to fetch guests with delivery status for notifications.
 */
export function useGuestsWithDeliveryStatus() {
  return useQuery({
    queryKey: ['guests-delivery-status'],
    queryFn: () => apiFetch<{ guests: any[] }>('/guests?include=delivery_status'),
  });
}

/**
 * Mutation hook to send single RSVP notification.
 */
export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { guest_id: string; channel: 'whatsapp' }) =>
      apiFetch<{ success: boolean; error?: string }>('/notifications/send', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests-delivery-status'] });
    },
  });
}

/**
 * Mutation hook to send bulk RSVP notifications.
 */
export function useSendBulkNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { guest_ids: string[]; channel: 'whatsapp' }) =>
      apiFetch<{
        results: {
          success: boolean;
          guest_id: string;
          channel: 'whatsapp';
          error?: string;
        }[];
      }>('/notifications/send-bulk', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests-delivery-status'] });
    },
  });
}

/**
 * Hook to fetch QR data for a guest.
 */
export function useGuestQr(guestId?: string | null) {
  return useQuery({
    queryKey: ['guest-qr', guestId],
    queryFn: () => apiFetch<any>(`/guests/${guestId}/qr`),
    enabled: !!guestId,
  });
}

/**
 * Mutation hook to bulk import guests from CSV.
 */
export function useImportGuests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { csv_text: string }) =>
      apiFetch<{ imported: number; errors: number; details: any[] }>('/guests/import', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['guests-delivery-status'] });
    },
  });
}
