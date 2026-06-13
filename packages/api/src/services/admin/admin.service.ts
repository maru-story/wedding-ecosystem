import bcrypt from 'bcrypt';
import { ErrorCode, UserRole } from '@wedding/shared';
import type { PlanType, GlobalStats } from '@wedding/shared';

// Re-export GlobalStats and sub-types from shared package for consumers of this service
export type {
  GlobalStats,
  PlanBreakdown,
  TenantStatusBreakdown,
  CheckInMethodBreakdown,
  EventStatusBreakdown,
} from '@wedding/shared';

const BCRYPT_COST_FACTOR = 10;

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  plan_type: PlanType;
  is_active: boolean;
  created_at: Date;
  client_username?: string | null;
  client_email?: string | null;
  client_name?: string | null;
}

export interface UserRecord {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  email: string;
  username: string | null;
  role: UserRole;
  name: string;
  is_active: boolean;
  created_at: Date;
}

export interface AuditLogRecord {
  id: string;
  timestamp: Date;
  user_id: string | null;
  user_email?: string | null;
  tenant_id: string | null;
  tenant_name?: string | null;
  action: string;
  request_id: string;
  metadata: Record<string, unknown> | null;
}

export interface AdminServiceError {
  code: ErrorCode;
  message: string;
}

export interface AdminRepository {
  listTenants(
    page: number,
    perPage: number,
    planType?: PlanType
  ): Promise<{ data: TenantRecord[]; total: number }>;

  createTenantWithClient(
    tenantData: { name: string; slug: string; plan_type: PlanType },
    clientUserData: { email: string; username: string | null; password_hash: string; name: string }
  ): Promise<TenantRecord>;

  updateTenantStatus(tenantId: string, isActive: boolean): Promise<TenantRecord | null>;

  listUsers(
    page: number,
    perPage: number,
    role?: UserRole
  ): Promise<{ data: UserRecord[]; total: number }>;

  updateUserPassword(userId: string, passwordHash: string): Promise<boolean>;

  updateUserStatus(userId: string, isActive: boolean): Promise<UserRecord | null>;

  createAdminUser(userData: {
    email: string;
    password_hash: string;
    name: string;
    tenant_id: string;
  }): Promise<UserRecord>;

  getGlobalStats(): Promise<GlobalStats>;

  checkTenantSlugExists(slug: string): Promise<boolean>;

  checkUserEmailExists(email: string): Promise<boolean>;

  checkUsernameExists(username: string): Promise<boolean>;

  checkTenantHasAdmin(tenantId: string): Promise<boolean>;

  listAuditLogs(
    page: number,
    perPage: number,
    action?: string,
    tenantId?: string,
    userId?: string,
    search?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: AuditLogRecord[]; total: number }>;

  deleteTenant(id: string): Promise<boolean>;

  getUserById(id: string): Promise<UserRecord | null>;

  deleteUser(id: string): Promise<boolean>;
}

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  async listTenants(
    page: number,
    perPage: number,
    planType?: PlanType
  ): Promise<{ data: TenantRecord[]; total: number }> {
    return this.repository.listTenants(page, perPage, planType);
  }

  async createTenant(
    tenantData: { name: string; slug: string; plan_type: PlanType },
    clientUserData: {
      email?: string | null;
      username?: string | null;
      passwordPlain: string;
      name: string;
    }
  ): Promise<TenantRecord | AdminServiceError> {
    // 1. Check if slug exists
    const slugExists = await this.repository.checkTenantSlugExists(tenantData.slug);
    if (slugExists) {
      return {
        code: ErrorCode.ALREADY_EXISTS,
        message: 'Slug tenant sudah digunakan',
      };
    }

    const username = clientUserData.username?.trim() || null;
    let email = clientUserData.email?.trim() || null;

    if (!username && !email) {
      return {
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Email atau Username harus diisi',
      };
    }

    // 2. If username is provided, check if it exists
    if (username) {
      const usernameExists = await this.repository.checkUsernameExists(username);
      if (usernameExists) {
        return {
          code: ErrorCode.ALREADY_EXISTS,
          message: 'Username sudah digunakan oleh pengguna lain',
        };
      }
    }

    // 3. If email is not provided, generate a placeholder based on username
    if (!email) {
      email = `${username}@wedding.local`;
    }

    // 4. Check if email exists
    const emailExists = await this.repository.checkUserEmailExists(email);
    if (emailExists) {
      return {
        code: ErrorCode.ALREADY_EXISTS,
        message: 'Email sudah digunakan oleh pengguna lain',
      };
    }

    // 5. Hash the password
    const passwordHash = await bcrypt.hash(clientUserData.passwordPlain, BCRYPT_COST_FACTOR);

    // 6. Create tenant and client in a transaction
    return this.repository.createTenantWithClient(tenantData, {
      email,
      username,
      password_hash: passwordHash,
      name: clientUserData.name,
    });
  }

  async toggleTenantStatus(
    tenantId: string,
    isActive: boolean
  ): Promise<TenantRecord | AdminServiceError> {
    const tenant = await this.repository.updateTenantStatus(tenantId, isActive);
    if (!tenant) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Tenant tidak ditemukan',
      };
    }
    return tenant;
  }

  async listUsers(
    page: number,
    perPage: number,
    role?: UserRole
  ): Promise<{ data: UserRecord[]; total: number }> {
    return this.repository.listUsers(page, perPage, role);
  }

  async resetUserPassword(
    userId: string,
    newPasswordPlain: string
  ): Promise<{ success: boolean } | AdminServiceError> {
    const passwordHash = await bcrypt.hash(newPasswordPlain, BCRYPT_COST_FACTOR);
    const success = await this.repository.updateUserPassword(userId, passwordHash);
    if (!success) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Pengguna tidak ditemukan atau gagal memperbarui password',
      };
    }
    return { success: true };
  }

  async toggleUserStatus(
    userId: string,
    isActive: boolean
  ): Promise<UserRecord | AdminServiceError> {
    const user = await this.repository.updateUserStatus(userId, isActive);
    if (!user) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Pengguna tidak ditemukan',
      };
    }
    return user;
  }

  async createAdminUser(
    email: string,
    passwordPlain: string,
    name: string,
    tenantId: string
  ): Promise<UserRecord | AdminServiceError> {
    const emailExists = await this.repository.checkUserEmailExists(email);
    if (emailExists) {
      return {
        code: ErrorCode.ALREADY_EXISTS,
        message: 'Email sudah digunakan oleh pengguna lain',
      };
    }

    const passwordHash = await bcrypt.hash(passwordPlain, BCRYPT_COST_FACTOR);
    return this.repository.createAdminUser({
      email,
      password_hash: passwordHash,
      name,
      tenant_id: tenantId,
    });
  }

  async getGlobalStats(): Promise<GlobalStats> {
    return this.repository.getGlobalStats();
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
    return this.repository.listAuditLogs(
      page,
      perPage,
      action,
      tenantId,
      userId,
      search,
      startDate,
      endDate
    );
  }

  async deleteTenant(tenantId: string): Promise<{ success: boolean } | AdminServiceError> {
    const hasAdmin = await this.repository.checkTenantHasAdmin(tenantId);
    if (hasAdmin) {
      return {
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Tenant tidak dapat dihapus karena memiliki pengguna dengan peran Administrator',
      };
    }

    const success = await this.repository.deleteTenant(tenantId);
    if (!success) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Tenant tidak ditemukan atau gagal dihapus',
      };
    }
    return { success: true };
  }

  async deleteUser(userId: string): Promise<{ success: boolean } | AdminServiceError> {
    const user = await this.repository.getUserById(userId);
    if (!user) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Pengguna tidak ditemukan atau gagal dihapus',
      };
    }

    if (user.role === UserRole.ADMIN) {
      return {
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Pengguna dengan peran Administrator tidak dapat dihapus',
      };
    }

    const success = await this.repository.deleteUser(userId);
    if (!success) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Pengguna tidak ditemukan atau gagal dihapus',
      };
    }
    return { success: true };
  }
}
