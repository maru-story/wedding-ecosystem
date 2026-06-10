/**
 * Prisma adapter for AdminRepository interface.
 *
 * Implements the repository seam defined by AdminService,
 * translating domain operations into Prisma queries.
 *
 * Scoped globally, bypassing standard tenant isolation checks.
 */

import { PrismaClient, Prisma } from '@wedding/db';
import { PlanType, UserRole } from '@wedding/shared';
import type {
  AdminRepository,
  TenantRecord,
  UserRecord,
  GlobalStats,
  AuditLogRecord,
} from '../services/admin/admin.service';

export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listTenants(
    page: number,
    perPage: number,
    planType?: PlanType
  ): Promise<{ data: TenantRecord[]; total: number }> {
    const skip = (page - 1) * perPage;
    const where: Prisma.TenantWhereInput = {};

    if (planType) {
      where.plan_type = planType;
    }

    const [total, tenants] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
        include: {
          users: {
            where: { role: 'client' },
            select: {
              username: true,
              email: true,
              name: true,
            },
            take: 1,
          },
        },
      }),
    ]);

    return {
      data: tenants.map((tenant) => {
        const primaryClient = tenant.users?.[0] || null;
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan_type: tenant.plan_type as PlanType,
          is_active: tenant.is_active,
          created_at: tenant.created_at,
          client_username: primaryClient?.username ?? null,
          client_email: primaryClient?.email ?? null,
          client_name: primaryClient?.name ?? null,
        };
      }),
      total,
    };
  }

  async createTenantWithClient(
    tenantData: { name: string; slug: string; plan_type: PlanType },
    clientUserData: { email: string; username: string | null; password_hash: string; name: string }
  ): Promise<TenantRecord> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantData.name,
          slug: tenantData.slug,
          plan_type: tenantData.plan_type,
          is_active: true,
        },
      });

      // 2. Create the primary client user for this tenant
      await tx.user.create({
        data: {
          tenant_id: tenant.id,
          email: clientUserData.email,
          username: clientUserData.username,
          password_hash: clientUserData.password_hash,
          role: 'client',
          name: clientUserData.name,
        },
      });

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan_type: tenant.plan_type as PlanType,
        is_active: tenant.is_active,
        created_at: tenant.created_at,
      };
    });
  }

  async updateTenantStatus(tenantId: string, isActive: boolean): Promise<TenantRecord | null> {
    try {
      const tenant = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { is_active: isActive },
      });

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan_type: tenant.plan_type as PlanType,
        is_active: tenant.is_active,
        created_at: tenant.created_at,
      };
    } catch {
      return null;
    }
  }

  async listUsers(
    page: number,
    perPage: number,
    role?: UserRole
  ): Promise<{ data: UserRecord[]; total: number }> {
    const skip = (page - 1) * perPage;
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
        include: {
          tenant: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      data: users.map((user) => ({
        id: user.id,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant?.name ?? null,
        email: user.email,
        username: user.username,
        role: user.role as UserRole,
        name: user.name,
        is_active: user.is_active,
        created_at: user.created_at,
      })),
      total,
    };
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { password_hash: passwordHash },
      });
      return true;
    } catch {
      return false;
    }
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<UserRecord | null> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { is_active: isActive },
        include: {
          tenant: {
            select: {
              name: true,
            },
          },
        },
      });

      return {
        id: user.id,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant?.name ?? null,
        email: user.email,
        username: user.username,
        role: user.role as UserRole,
        name: user.name,
        is_active: user.is_active,
        created_at: user.created_at,
      };
    } catch {
      return null;
    }
  }

  async createAdminUser(userData: {
    email: string;
    password_hash: string;
    name: string;
    tenant_id: string;
  }): Promise<UserRecord> {
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        password_hash: userData.password_hash,
        name: userData.name,
        tenant_id: userData.tenant_id,
        role: UserRole.ADMIN,
        is_active: true,
      },
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      id: user.id,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant?.name ?? null,
      email: user.email,
      username: user.username,
      role: user.role as UserRole,
      name: user.name,
      is_active: user.is_active,
      created_at: user.created_at,
    };
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const [
      totalTenants,
      totalUsers,
      activeScannerDevices,
      totalGuests,
      totalEvents,
      totalCheckins,
      totalRsvps,
      totalWishes,
      plans,
      statuses,
      methods,
      eventStatuses
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.scannerDevice.count({ where: { is_active: true } }),
      this.prisma.guest.count(),
      this.prisma.event.count(),
      this.prisma.checkIn.count(),
      this.prisma.rSVP.count(),
      this.prisma.message.count(),
      this.prisma.tenant.groupBy({ by: ['plan_type'], _count: { id: true } }),
      this.prisma.tenant.groupBy({ by: ['is_active'], _count: { id: true } }),
      this.prisma.checkIn.groupBy({ by: ['method'], _count: { id: true } }),
      this.prisma.event.groupBy({ by: ['status'], _count: { id: true } }),
    ]);

    const tenants_by_plan = { basic: 0, premium: 0, enterprise: 0 };
    for (const p of plans) {
      const count = p._count?.id ?? 0;
      if (p.plan_type === 'basic') tenants_by_plan.basic = count;
      if (p.plan_type === 'premium') tenants_by_plan.premium = count;
      if (p.plan_type === 'enterprise') tenants_by_plan.enterprise = count;
    }

    const tenant_status = { active: 0, inactive: 0 };
    for (const s of statuses) {
      const count = s._count?.id ?? 0;
      if (s.is_active) {
        tenant_status.active = count;
      } else {
        tenant_status.inactive = count;
      }
    }

    const checkin_methods = { qr_scan: 0, manual: 0, go_show: 0 };
    for (const m of methods) {
      const count = m._count?.id ?? 0;
      if (m.method === 'qr_scan') checkin_methods.qr_scan = count;
      if (m.method === 'manual') checkin_methods.manual = count;
      if (m.method === 'go_show') checkin_methods.go_show = count;
    }

    const event_status = { draft: 0, published: 0, completed: 0 };
    for (const es of eventStatuses) {
      const count = es._count?.id ?? 0;
      if (es.status === 'draft') event_status.draft = count;
      if (es.status === 'published') event_status.published = count;
      if (es.status === 'completed') event_status.completed = count;
    }

    const avg_guests_per_event = totalEvents > 0 ? Number((totalGuests / totalEvents).toFixed(1)) : 0;
    const avg_attendance_rate = totalGuests > 0 ? Number(((totalCheckins / totalGuests) * 100).toFixed(1)) : 0;

    return {
      total_tenants: totalTenants,
      total_users: totalUsers,
      active_scanner_devices: activeScannerDevices,
      total_guests: totalGuests,
      total_events: totalEvents,
      tenants_by_plan,
      tenant_status,
      total_checkins: totalCheckins,
      total_rsvps: totalRsvps,
      total_wishes: totalWishes,
      avg_guests_per_event,
      avg_attendance_rate,
      checkin_methods,
      event_status,
    };
  }

  async checkTenantSlugExists(slug: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    return tenant !== null;
  }

  async checkTenantHasAdmin(tenantId: string): Promise<boolean> {
    const adminUser = await this.prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        role: UserRole.ADMIN,
      },
      select: { id: true },
    });
    return adminUser !== null;
  }

  async checkUserEmailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });
    return user !== null;
  }

  async listAuditLogs(
    page: number,
    perPage: number,
    action?: string,
    tenantId?: string,
    userId?: string,
    search?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: AuditLogRecord[]; total: number }> {
    const skip = (page - 1) * perPage;
    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }
    if (tenantId) {
      where.tenant_id = tenantId;
    }
    if (userId) {
      where.user_id = userId;
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { request_id: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const foundTenantIds: string[] = Array.from(
      new Set(logs.map((l) => l.tenant_id).filter((id): id is string => id !== null))
    );
    const foundUserIds: string[] = Array.from(
      new Set(logs.map((l) => l.user_id).filter((id): id is string => id !== null))
    );

    const [tenants, users] = await Promise.all([
      foundTenantIds.length > 0
        ? this.prisma.tenant.findMany({
            where: { id: { in: foundTenantIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      foundUserIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: foundUserIds } },
            select: { id: true, email: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const tenantMap = new Map<string, string>(tenants.map((t) => [t.id, t.name]));
    const userMap = new Map<string, { email: string; name: string }>(
      users.map((u) => [u.id, { email: u.email, name: u.name }])
    );

    const data = logs.map((log) => {
      const tenantName = log.tenant_id ? tenantMap.get(log.tenant_id) || null : null;
      const user = log.user_id ? userMap.get(log.user_id) || null : null;

      return {
        id: log.id,
        timestamp: log.timestamp,
        user_id: log.user_id,
        user_email: user?.email ?? null,
        user_name: user?.name ?? null,
        tenant_id: log.tenant_id,
        tenant_name: tenantName,
        action: log.action,
        request_id: log.request_id,
        metadata: (log.metadata as Record<string, unknown>) || null,
      };
    });

    return { data, total };
  }

  async deleteTenant(id: string): Promise<boolean> {
    try {
      await this.prisma.tenant.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          tenant: {
            select: {
              name: true,
            },
          },
        },
      });
      if (!user) return null;
      return {
        id: user.id,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant?.name ?? null,
        email: user.email,
        username: user.username,
        role: user.role as UserRole,
        name: user.name,
        is_active: user.is_active,
        created_at: user.created_at,
      };
    } catch {
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}
