import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@wedding/db';
import { AdminService } from '../services/admin/admin.service';
import { PrismaAdminRepository } from '../repositories/admin.repository';
import { PlanType, UserRole, ErrorCode, paginationSchema } from '@wedding/shared';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { getCacheClient } from '../config/redis/redis';

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
    const bodySchema = z
      .object({
        name: z.string().min(1, 'Nama tenant tidak boleh kosong'),
        slug: z
          .string()
          .min(1, 'Slug tenant tidak boleh kosong')
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung'
          ),
        plan_type: z.nativeEnum(PlanType),
        client_email: z
          .string()
          .email('Format email tidak valid')
          .optional()
          .nullable()
          .or(z.literal('')),
        client_username: z
          .string()
          .max(100, 'Username maksimal 100 karakter')
          .refine((val) => !val || (/^[a-zA-Z0-9_.-]+$/.test(val) && val.length >= 3), {
            message:
              'Username minimal 3 karakter dan hanya boleh berisi huruf, angka, titik, underscore, atau dash',
          })
          .optional()
          .nullable(),
        client_name: z.string().min(1, 'Nama client tidak boleh kosong'),
        client_password: z.string().min(8, 'Password minimal 8 karakter'),
      })
      .refine(
        (data) => {
          const email = data.client_email?.trim();
          const username = data.client_username?.trim();
          return !!email || !!username;
        },
        {
          message: 'Salah satu dari Email atau Username harus diisi',
          path: ['client_username'],
        }
      );

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    const result = await adminService.createTenant(
      {
        name: body.name,
        slug: body.slug,
        plan_type: body.plan_type,
      },
      {
        email: body.client_email || null,
        username: body.client_username || null,
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

  // DELETE /admin/tenants/:id
  app.delete('/tenants/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid({ message: 'ID tenant tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    // Prevent deleting the tenant they currently belong to
    if (params.id === request.user?.tenant_id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Anda tidak dapat menghapus tenant tempat akun Anda terdaftar',
        },
      });
    }

    const result = await adminService.deleteTenant(params.id);
    if ('code' in result) {
      const statusCode = result.code === ErrorCode.NOT_FOUND ? 404 : 400;
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Tenant berhasil dihapus',
    });
  });

  // GET /admin/audit-logs
  app.get('/audit-logs', async (request, reply) => {
    const querySchema = paginationSchema.extend({
      action: z.string().optional(),
      tenant_id: z.string().optional(),
      user_id: z.string().optional(),
      search: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    });

    const query = validate(request.query, querySchema, reply);
    if (!query) return reply;

    const result = await adminService.listAuditLogs(
      query.page!,
      query.per_page!,
      query.action === 'ALL' || !query.action ? undefined : query.action,
      query.tenant_id === 'ALL' || !query.tenant_id ? undefined : query.tenant_id,
      query.user_id === 'ALL' || !query.user_id ? undefined : query.user_id,
      query.search || undefined,
      query.start_date || undefined,
      query.end_date || undefined
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

  // PATCH /admin/users/:id/status
  app.patch('/users/:id/status', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid({ message: 'ID user tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const bodySchema = z.object({
      is_active: z.boolean({ required_error: 'Status aktif/nonaktif harus ditentukan' }),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    // Prevent admin from deactivating themselves
    if (params.id === request.user?.id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Anda tidak dapat menonaktifkan akun Anda sendiri',
        },
      });
    }

    const result = await adminService.toggleUserStatus(params.id, body.is_active);
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

  // DELETE /admin/users/:id
  app.delete('/users/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid({ message: 'ID user tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    // Prevent admin from deleting themselves
    if (params.id === request.user?.id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Anda tidak dapat menghapus akun Anda sendiri',
        },
      });
    }

    const result = await adminService.deleteUser(params.id);
    if ('code' in result) {
      const statusCode = result.code === ErrorCode.NOT_FOUND ? 404 : 400;
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Pengguna berhasil dihapus',
    });
  });

  // POST /admin/users/admin
  app.post('/users/admin', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email('Format email tidak valid'),
      name: z.string().min(1, 'Nama tidak boleh kosong'),
      password: z.string().min(8, 'Password minimal 8 karakter'),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    const result = await adminService.createAdminUser(
      body.email,
      body.password,
      body.name,
      request.user!.tenant_id
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

  // GET /admin/tenants/:id/events - List events for a tenant with their config limits
  app.get('/tenants/:id/events', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid({ message: 'ID tenant tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const events = await prisma.event.findMany({
      where: { tenant_id: params.id },
      include: {
        event_config: {
          select: {
            max_guests: true,
            max_scanner_devices: true,
            max_gallery_photos: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({
      success: true,
      data: events,
    });
  });

  // PATCH /admin/events/:eventId/config - Update event config limits
  app.patch('/events/:eventId/config', async (request, reply) => {
    const paramsSchema = z.object({
      eventId: z.string().uuid({ message: 'ID event tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const bodySchema = z.object({
      max_guests: z.number().int().min(1, 'Jumlah tamu minimal 1').max(100000).optional(),
      max_scanner_devices: z.number().int().min(1, 'Jumlah scanner minimal 1').max(10).optional(),
      max_gallery_photos: z
        .number()
        .int()
        .min(1, 'Jumlah foto galeri minimal 1')
        .max(100)
        .optional(),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    // Verify the event exists first
    const eventExists = await prisma.event.findUnique({
      where: { id: params.eventId },
    });

    if (!eventExists) {
      return reply.status(404).send({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Event tidak ditemukan',
        },
      });
    }

    // Upsert: create EventConfig with defaults if it doesn't exist yet
    // (handles events created before the quota feature was added)
    const updatedConfig = await prisma.eventConfig.upsert({
      where: { event_id: params.eventId },
      update: {
        max_guests: body.max_guests,
        max_scanner_devices: body.max_scanner_devices,
        max_gallery_photos: body.max_gallery_photos,
      },
      create: {
        event_id: params.eventId,
        theme_config: {},
        active_sections: [],
        max_guests: body.max_guests ?? 2000,
        max_scanner_devices: body.max_scanner_devices ?? 2,
        max_gallery_photos: body.max_gallery_photos ?? 30,
      },
    });

    // Invalidate response cache for this tenant
    const redis = getCacheClient();
    if (redis) {
      const scanPattern = `rc:events:${eventExists.tenant_id}:*`;
      try {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', scanPattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } while (cursor !== '0');
      } catch (err) {
        request.log.error(err, 'Failed to invalidate cache for tenant event config update');
      }
    }

    return reply.send({
      success: true,
      data: updatedConfig,
    });
  });
}
