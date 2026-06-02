import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { InvitationSection } from '@/lib/cms';
import {
  GUESTS_PER_PAGE,
  ADMIN_PER_PAGE,
  STATS_REFETCH_INTERVAL_MS,
} from '@/lib/constants';

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
  perPage?: number;
  group?: string;
  status?: string;
  q?: string;
}

/**
 * Hook to fetch guests for the active event.
 * Integrated with React Query for automatic caching, pagination, filtering, and revalidation.
 */
export function useGuests({
  page = 1,
  perPage = GUESTS_PER_PAGE,
  group,
  status,
  q,
}: UseGuestsParams = {}) {
  return useQuery({
    queryKey: ['guests', { page, perPage, group, status, q }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (group) params.set('group', group);
      if (status) params.set('status', status);
      if (q) params.set('q', q);
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
      queryClient.invalidateQueries({ queryKey: ['guests-delivery-status'] });
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
      queryClient.invalidateQueries({ queryKey: ['guests-delivery-status'] });
    },
  });
}

/**
 * Mutation hook to bulk delete guests.
 */
export function useBulkDeleteGuests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<{ success: boolean; deletedCount: number }>('/guests/bulk-delete', {
        method: 'POST',
        body: { ids },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['guests-delivery-status'] });
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
    refetchInterval: STATS_REFETCH_INTERVAL_MS,
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
  perPage = ADMIN_PER_PAGE,
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
  perPage = ADMIN_PER_PAGE,
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
  startDate = '',
  endDate = '',
}: {
  page?: number;
  search?: string;
  action?: string;
  tenantId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  return useQuery({
    queryKey: ['admin-audit-logs', { page, search, action, tenantId, userId, startDate, endDate }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: String(ADMIN_PER_PAGE),
      });
      if (search) params.set('search', search);
      if (action !== 'ALL') params.set('action', action);
      if (tenantId !== 'ALL') params.set('tenant_id', tenantId);
      if (userFilterKey(userId) !== 'ALL') params.set('user_id', userId);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
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
 * Now supports pagination and search.
 */
export function useGuestsWithDeliveryStatus({
  page = 1,
  perPage = GUESTS_PER_PAGE,
  q,
}: {
  page?: number;
  perPage?: number;
  q?: string;
} = {}) {
  return useQuery({
    queryKey: ['guests-delivery-status', { page, perPage, q }],
    queryFn: () => {
      const params = new URLSearchParams({
        include: 'delivery_status',
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (q) params.set('q', q);
      return apiFetch<{ data: any[]; pagination: any }>(`/guests?${params.toString()}`);
    },
  });
}

/**
 * Mutation hook to send single RSVP invitation.
 */
export function useSendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { guest_id: string; channel: 'whatsapp' }) =>
      apiFetch<{ success: boolean; data: any }>('/invitation-deliveries/send', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests-delivery-status'] });
    },
  });
}

/**
 * Hook to fetch the invitation message template.
 */
export function useInvitationTemplate() {
  return useQuery({
    queryKey: ['invitation-template'],
    queryFn: () => apiFetch<{ success: boolean; data: { template: string } }>('/invitation-deliveries/message-template'),
  });
}

/**
 * Mutation hook to update the invitation message template.
 */
export function useUpdateInvitationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { template: string }) =>
      apiFetch<{ success: boolean }>('/invitation-deliveries/message-template', {
        method: 'PUT',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation-template'] });
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

/**
 * Hook to fetch all CMS sections for an event.
 */
export function useCmsSections(eventId?: string | null) {
  return useQuery({
    queryKey: ['cms-sections', eventId],
    queryFn: () =>
      apiFetch<{ data: InvitationSection[] }>(`/cms/sections/${eventId}`).then((res) => res.data),
    enabled: !!eventId,
  });
}

/**
 * Hook to fetch a single CMS section.
 */
export function useCmsSection(eventId?: string | null, sectionId?: string | null) {
  return useQuery({
    queryKey: ['cms-section', eventId, sectionId],
    queryFn: () => apiFetch<InvitationSection>(`/cms/sections/${eventId}/${sectionId}`),
    enabled: !!eventId && !!sectionId,
  });
}

/**
 * Mutation to update CMS section content.
 */
export function useUpdateCmsSectionContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      sectionId,
      content,
    }: {
      eventId: string;
      sectionId: string;
      content: Record<string, unknown>;
    }) =>
      apiFetch<InvitationSection>(`/cms/sections/${eventId}/${sectionId}/content`, {
        method: 'PUT',
        body: { content },
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cms-sections', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['cms-section', variables.eventId, variables.sectionId] });
    },
  });
}

/**
 * Mutation to toggle a CMS section active/inactive.
 */
export function useToggleCmsSectionActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      sectionId,
      isActive,
    }: {
      eventId: string;
      sectionId: string;
      isActive: boolean;
    }) =>
      apiFetch<InvitationSection>(`/cms/sections/${eventId}/${sectionId}/toggle`, {
        method: 'PUT',
        body: { is_active: isActive },
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grid-sections', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['cms-sections', variables.eventId] });
    },
  });
}

/**
 * Mutation to reorder a CMS section.
 */
export function useReorderCmsSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      sectionId,
      position,
    }: {
      eventId: string;
      sectionId: string;
      position: number;
    }) =>
      apiFetch<InvitationSection>(`/cms/sections/${eventId}/${sectionId}/reorder`, {
        method: 'PUT',
        body: { position },
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cms-sections', variables.eventId] });
    },
  });
}

interface UseWishesParams {
  eventId: string | undefined;
  page?: number;
  perPage?: number;
}

export function useAdminWishes({ eventId, page = 1, perPage = 20 }: UseWishesParams) {
  return useQuery({
    queryKey: ['admin-wishes', { eventId, page, perPage }],
    queryFn: async () => {
      if (!eventId) return null;
      return apiFetch<any>(`/messages/${eventId}/admin?page=${page}&per_page=${perPage}`);
    },
    enabled: !!eventId,
  });
}

export function useToggleWishVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      apiFetch<any>(`/messages/${id}/visibility`, {
        method: 'PUT',
        body: { is_visible: isVisible },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wishes'] });
    },
  });
}

export function useDeleteWish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<any>(`/messages/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wishes'] });
    },
  });
}
