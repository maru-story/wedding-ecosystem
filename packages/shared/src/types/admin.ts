// Admin platform types — shared between backend API and dashboard frontend

/** Breakdown of tenants by subscription plan type */
export interface PlanBreakdown {
  basic: number;
  premium: number;
  enterprise: number;
}

/** Breakdown of tenants by active/inactive status */
export interface TenantStatusBreakdown {
  active: number;
  inactive: number;
}

/** Breakdown of check-in methods used across the platform */
export interface CheckInMethodBreakdown {
  qr_scan: number;
  manual: number;
  go_show: number;
}

/** Breakdown of events by their current status */
export interface EventStatusBreakdown {
  draft: number;
  published: number;
  completed: number;
}

/** Global platform statistics returned by GET /admin/stats */
export interface GlobalStats {
  total_tenants: number;
  total_users: number;
  active_scanner_devices: number;
  total_guests: number;
  total_events: number;
  tenants_by_plan: PlanBreakdown;
  tenant_status: TenantStatusBreakdown;
  total_checkins: number;
  total_rsvps: number;
  total_wishes: number;
  avg_guests_per_event: number;
  avg_attendance_rate: number;
  checkin_methods: CheckInMethodBreakdown;
  event_status: EventStatusBreakdown;
}
