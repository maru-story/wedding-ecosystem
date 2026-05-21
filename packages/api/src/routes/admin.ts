import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@wedding/db';
import { AdminService } from '../services/admin/admin.service';
import { PrismaAdminRepository } from '../repositories/admin.repository';
import { PlanType, UserRole, ErrorCode, paginationSchema } from '@wedding/shared';
import { z } from 'zod';
import { validate } from '../middleware/validate';

interface AdminRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function adminRoutes(app: FastifyInstance, opts: AdminRouteOptions) {
  const { prisma } = opts;
  const repository = new PrismaAdminRepository(prisma);
  const adminService = new AdminService(repository);

  // Enforce authentication & global admin role
  app.addHook('onRequest', async (request, reply) => {
    await app.authenticate(request, reply);
    
    if (request.user?.role !== UserRole.ADMIN) {
      return reply.status(403).send({
        success: false,
        error: {
          code: ErrorCode.ROLE_INSUFFICIENT,
          message: 'Hanya administrator yang diizinkan untuk mengakses resource ini',
        },
      });
    }
  });

  // GET /admin/stats
  app.get('/stats', async (_request, reply) => {
    const stats = await adminService.getGlobalStats();
    return reply.send({ success: true, data: stats });
  });

  // GET /admin/tenants
  app.get('/tenants', async (request, reply) => {
    const querySchema = paginationSchema.extend({
      plan_type: z.nativeEnum(PlanType).optional(),
    });

    const query = validate(request.query, querySchema, reply);
    if (!query) return reply;

    const result = await adminService.listTenants(query.page!, query.per_page!, query.plan_type);
    return reply.send({
      success: true,
      data: result.data,
      pagination: {
        page: query.page!,
        per_page: query.per_page!,
        total: result.total,
        total_pages: Math.ceil(result.total / query.per_page!),
      },
    });
  });

  // POST /admin/tenants
  app.post('/tenants', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1, 'Nama tenant tidak boleh kosong'),
      slug: z.string().min(1, 'Slug tenant tidak boleh kosong').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung'),
      plan_type: z.nativeEnum(PlanType),
      client_email: z.string().email('Format email tidak valid'),
      client_name: z.string().min(1, 'Nama client tidak boleh kosong'),
      client_password: z.string().min(8, 'Password minimal 8 karakter'),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    const result = await adminService.createTenant(
      {
        name: body.name,
        slug: body.slug,
        plan_type: body.plan_type,
      },
      {
        email: body.client_email,
        name: body.client_name,
        passwordPlain: body.client_password,
      }
    );

    if ('code' in result) {
      return reply.status(400).send({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return reply.status(201).send({
      success: true,
      data: result,
    });
  });

  // PATCH /admin/tenants/:id/status
  app.patch('/tenants/:id/status', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid({ message: 'ID tenant tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const bodySchema = z.object({
      is_active: z.boolean({ required_error: 'Status aktif/nonaktif harus ditentukan' }),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    const result = await adminService.toggleTenantStatus(params.id, body.is_active);
    if ('code' in result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return reply.send({
      success: true,
      data: result,
    });
  });

  // GET /admin/audit-logs
  app.get('/audit-logs', async (request, reply) => {
    const querySchema = paginationSchema.extend({
      action: z.string().optional(),
      tenant_id: z.string().optional(),
      user_id: z.string().optional(),
      search: z.string().optional(),
    });

    const query = validate(request.query, querySchema, reply);
    if (!query) return reply;

    const result = await adminService.listAuditLogs(
      query.page!,
      query.per_page!,
      query.action === 'ALL' || !query.action ? undefined : query.action,
      query.tenant_id === 'ALL' || !query.tenant_id ? undefined : query.tenant_id,
      query.user_id === 'ALL' || !query.user_id ? undefined : query.user_id,
      query.search || undefined
    );

    return reply.send({
      success: true,
      data: result.data,
      pagination: {
        page: query.page!,
        per_page: query.per_page!,
        total: result.total,
        total_pages: Math.ceil(result.total / query.per_page!),
      },
    });
  });

  // GET /admin/users
  app.get('/users', async (request, reply) => {
    const querySchema = paginationSchema.extend({
      role: z.nativeEnum(UserRole).optional(),
    });

    const query = validate(request.query, querySchema, reply);
    if (!query) return reply;

    const result = await adminService.listUsers(query.page!, query.per_page!, query.role);
    return reply.send({
      success: true,
      data: result.data,
      pagination: {
        page: query.page!,
        per_page: query.per_page!,
        total: result.total,
        total_pages: Math.ceil(result.total / query.per_page!),
      },
    });
  });

  // PUT /admin/users/:id/reset-password
  app.put('/users/:id/reset-password', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid({ message: 'ID user tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const bodySchema = z.object({
      password: z.string().min(8, 'Password minimal 8 karakter'),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    const result = await adminService.resetUserPassword(params.id, body.password);
    if ('code' in result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Password berhasil diperbarui',
    });
  });
}
