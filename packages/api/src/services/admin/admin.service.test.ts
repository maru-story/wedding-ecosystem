import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorCode, PlanType, UserRole } from '@wedding/shared';
import {
  AdminService,
  AdminRepository,
  TenantRecord,
  UserRecord,
  GlobalStats,
  AdminServiceError,
} from './admin.service';

class MockAdminRepository implements AdminRepository {
  tenants: TenantRecord[] = [];
  users: UserRecord[] = [];
  stats: GlobalStats = {
    total_tenants: 0,
    total_users: 0,
    active_scanner_devices: 0,
    total_guests: 0,
    total_events: 0,
    tenants_by_plan: { basic: 0, premium: 0, enterprise: 0 },
    tenant_status: { active: 0, inactive: 0 },
    total_checkins: 0,
    total_rsvps: 0,
    total_wishes: 0,
    avg_guests_per_event: 0,
    avg_attendance_rate: 0,
    checkin_methods: { qr_scan: 0, manual: 0, go_show: 0 },
    event_status: { draft: 0, published: 0, completed: 0 },
  };
  slugExistsMap = new Map<string, boolean>();
  emailExistsMap = new Map<string, boolean>();

  async listTenants(
    page: number,
    perPage: number,
    planType?: PlanType
  ): Promise<{ data: TenantRecord[]; total: number }> {
    let filtered = this.tenants;
    if (planType) {
      filtered = filtered.filter((t) => t.plan_type === planType);
    }
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
      data: filtered.slice(start, end),
      total: filtered.length,
    };
  }

  async createTenantWithClient(
    tenantData: { name: string; slug: string; plan_type: PlanType },
    clientUserData: { email: string; password_hash: string; name: string }
  ): Promise<TenantRecord> {
    const tenant: TenantRecord = {
      id: `tenant-${this.tenants.length + 1}`,
      name: tenantData.name,
      slug: tenantData.slug,
      plan_type: tenantData.plan_type,
      is_active: true,
      created_at: new Date(),
    };
    this.tenants.push(tenant);

    const user: UserRecord = {
      id: `user-${this.users.length + 1}`,
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      email: clientUserData.email,
      username: null,
      role: UserRole.CLIENT,
      name: clientUserData.name,
      is_active: true,
      created_at: new Date(),
    };
    this.users.push(user);

    return tenant;
  }

  async updateTenantStatus(tenantId: string, isActive: boolean): Promise<TenantRecord | null> {
    const tenant = this.tenants.find((t) => t.id === tenantId);
    if (!tenant) return null;
    tenant.is_active = isActive;
    return tenant;
  }

  async listUsers(
    page: number,
    perPage: number,
    role?: UserRole
  ): Promise<{ data: UserRecord[]; total: number }> {
    let filtered = this.users;
    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
      data: filtered.slice(start, end),
      total: filtered.length,
    };
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return false;
    return true;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<UserRecord | null> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;
    user.is_active = isActive;
    return user;
  }

  async createAdminUser(userData: {
    email: string;
    password_hash: string;
    name: string;
    tenant_id: string;
  }): Promise<UserRecord> {
    const user: UserRecord = {
      id: `user-${this.users.length + 1}`,
      tenant_id: userData.tenant_id,
      tenant_name: 'System Admin',
      email: userData.email,
      username: null,
      role: UserRole.ADMIN,
      name: userData.name,
      is_active: true,
      created_at: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async getGlobalStats(): Promise<GlobalStats> {
    return this.stats;
  }

  async checkTenantSlugExists(slug: string): Promise<boolean> {
    return this.slugExistsMap.get(slug) ?? false;
  }

  async checkUserEmailExists(email: string): Promise<boolean> {
    return this.emailExistsMap.get(email) ?? false;
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    return this.users.some((u) => u.username === username);
  }

  async checkTenantHasAdmin(tenantId: string): Promise<boolean> {
    return this.users.some((u) => u.tenant_id === tenantId && u.role === UserRole.ADMIN);
  }

  async listAuditLogs(): Promise<{ data: any[]; total: number }> {
    return { data: [], total: 0 };
  }

  async deleteTenant(id: string): Promise<boolean> {
    const idx = this.tenants.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.tenants.splice(idx, 1);
    return true;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    return true;
  }
}

describe('AdminService', () => {
  let repository: MockAdminRepository;
  let service: AdminService;

  beforeEach(() => {
    repository = new MockAdminRepository();
    service = new AdminService(repository);
  });

  describe('listTenants', () => {
    it('should return a paginated list of tenants', async () => {
      repository.tenants = [
        {
          id: '1',
          name: 'Tenant 1',
          slug: 't1',
          plan_type: PlanType.BASIC,
          is_active: true,
          created_at: new Date(),
        },
        {
          id: '2',
          name: 'Tenant 2',
          slug: 't2',
          plan_type: PlanType.PREMIUM,
          is_active: true,
          created_at: new Date(),
        },
      ];

      const res = await service.listTenants(1, 1);
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(2);
      expect(res.data[0].id).toBe('1');
    });

    it('should filter tenants by plan type', async () => {
      repository.tenants = [
        {
          id: '1',
          name: 'Tenant 1',
          slug: 't1',
          plan_type: PlanType.BASIC,
          is_active: true,
          created_at: new Date(),
        },
        {
          id: '2',
          name: 'Tenant 2',
          slug: 't2',
          plan_type: PlanType.PREMIUM,
          is_active: true,
          created_at: new Date(),
        },
      ];

      const res = await service.listTenants(1, 10, PlanType.PREMIUM);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('2');
    });
  });

  describe('createTenant', () => {
    it('should create a tenant and client user successfully', async () => {
      const tenantData = { name: 'New Tenant', slug: 'new-tenant', plan_type: PlanType.BASIC };
      const clientData = {
        email: 'client@example.com',
        name: 'Client User',
        passwordPlain: 'password123',
      };

      const result = await service.createTenant(tenantData, clientData);
      expect('code' in result).toBe(false);

      const tenant = result as TenantRecord;
      expect(tenant.name).toBe('New Tenant');
      expect(tenant.slug).toBe('new-tenant');
      expect(repository.tenants).toHaveLength(1);
      expect(repository.users).toHaveLength(1);
      expect(repository.users[0].email).toBe('client@example.com');
    });

    it('should return error if tenant slug already exists', async () => {
      repository.slugExistsMap.set('existing-slug', true);
      const tenantData = { name: 'New Tenant', slug: 'existing-slug', plan_type: PlanType.BASIC };
      const clientData = {
        email: 'client@example.com',
        name: 'Client User',
        passwordPlain: 'password123',
      };

      const result = await service.createTenant(tenantData, clientData);
      expect('code' in result).toBe(true);
      expect((result as AdminServiceError).code).toBe(ErrorCode.ALREADY_EXISTS);
      expect((result as AdminServiceError).message).toBe('Slug tenant sudah digunakan');
    });

    it('should return error if client user email already exists', async () => {
      repository.emailExistsMap.set('existing@example.com', true);
      const tenantData = { name: 'New Tenant', slug: 'new-tenant', plan_type: PlanType.BASIC };
      const clientData = {
        email: 'existing@example.com',
        name: 'Client User',
        passwordPlain: 'password123',
      };

      const result = await service.createTenant(tenantData, clientData);
      expect('code' in result).toBe(true);
      expect((result as AdminServiceError).code).toBe(ErrorCode.ALREADY_EXISTS);
      expect((result as AdminServiceError).message).toBe(
        'Email sudah digunakan oleh pengguna lain'
      );
    });
  });

  describe('toggleTenantStatus', () => {
    it('should update tenant active status successfully', async () => {
      const tenant = {
        id: 'tenant-1',
        name: 'Tenant 1',
        slug: 't1',
        plan_type: PlanType.BASIC,
        is_active: true,
        created_at: new Date(),
      };
      repository.tenants.push(tenant);

      const result = await service.toggleTenantStatus('tenant-1', false);
      expect('code' in result).toBe(false);
      expect((result as TenantRecord).is_active).toBe(false);
    });

    it('should return error if tenant is not found', async () => {
      const result = await service.toggleTenantStatus('non-existent', false);
      expect('code' in result).toBe(true);
      expect((result as AdminServiceError).code).toBe(ErrorCode.NOT_FOUND);
      expect((result as AdminServiceError).message).toBe('Tenant tidak ditemukan');
    });
  });

  describe('listUsers', () => {
    it('should return paginated and filtered users', async () => {
      repository.users = [
        {
          id: '1',
          tenant_id: 't1',
          tenant_name: 'T1',
          email: 'u1@test.com',
          role: 'admin' as UserRole,
          name: 'Admin 1',
          created_at: new Date(),
        },
        {
          id: '2',
          tenant_id: 't2',
          tenant_name: 'T2',
          email: 'u2@test.com',
          role: 'client' as UserRole,
          name: 'Client 1',
          created_at: new Date(),
        },
      ];

      const res = await service.listUsers(1, 10, 'client' as UserRole);
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.data[0].id).toBe('2');
    });
  });

  describe('resetUserPassword', () => {
    it('should reset user password successfully', async () => {
      const user = {
        id: 'user-1',
        tenant_id: 't1',
        tenant_name: 'T1',
        email: 'u1@test.com',
        role: 'client' as UserRole,
        name: 'Client 1',
        created_at: new Date(),
      };
      repository.users.push(user);

      const result = await service.resetUserPassword('user-1', 'newpassword123');
      expect('code' in result).toBe(false);
      expect((result as { success: boolean }).success).toBe(true);
    });

    it('should return error if user is not found', async () => {
      const result = await service.resetUserPassword('non-existent', 'newpassword123');
      expect('code' in result).toBe(true);
      expect((result as AdminServiceError).code).toBe(ErrorCode.NOT_FOUND);
      expect((result as AdminServiceError).message).toBe(
        'Pengguna tidak ditemukan atau gagal memperbarui password'
      );
    });
  });

  describe('getGlobalStats', () => {
    it('should return global stats', async () => {
      const mockStats = {
        total_tenants: 10,
        total_users: 25,
        active_scanner_devices: 3,
        total_guests: 150,
        total_events: 5,
        tenants_by_plan: { basic: 7, premium: 2, enterprise: 1 },
        tenant_status: { active: 8, inactive: 2 },
        total_checkins: 80,
        total_rsvps: 90,
        total_wishes: 75,
        avg_guests_per_event: 30,
        avg_attendance_rate: 53.3,
        checkin_methods: { qr_scan: 60, manual: 15, go_show: 5 },
        event_status: { draft: 1, published: 3, completed: 1 },
      };
      repository.stats = mockStats;

      const res = await service.getGlobalStats();
      expect(res).toEqual(mockStats);
    });
  });

  describe('deleteUser', () => {
    it('should delete non-admin user successfully', async () => {
      const user = {
        id: 'user-to-delete',
        tenant_id: 't1',
        tenant_name: 'T1',
        email: 'client@test.com',
        username: null,
        role: UserRole.CLIENT,
        name: 'Client User',
        is_active: true,
        created_at: new Date(),
      };
      repository.users.push(user);

      const result = await service.deleteUser('user-to-delete');
      expect('code' in result).toBe(false);
      expect((result as { success: boolean }).success).toBe(true);
      expect(repository.users.find((u) => u.id === 'user-to-delete')).toBeUndefined();
    });

    it('should return validation error when trying to delete admin user', async () => {
      const adminUser = {
        id: 'admin-to-delete',
        tenant_id: 't1',
        tenant_name: 'T1',
        email: 'admin@test.com',
        username: null,
        role: UserRole.ADMIN,
        name: 'Admin User',
        is_active: true,
        created_at: new Date(),
      };
      repository.users.push(adminUser);

      const result = await service.deleteUser('admin-to-delete');
      expect('code' in result).toBe(true);
      expect((result as AdminServiceError).code).toBe(ErrorCode.VALIDATION_FAILED);
      expect((result as AdminServiceError).message).toBe(
        'Pengguna dengan peran Administrator tidak dapat dihapus'
      );
      expect(repository.users.find((u) => u.id === 'admin-to-delete')).toBeDefined();
    });

    it('should return not found error when user does not exist', async () => {
      const result = await service.deleteUser('non-existent');
      expect('code' in result).toBe(true);
      expect((result as AdminServiceError).code).toBe(ErrorCode.NOT_FOUND);
    });
  });
});
