import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { PrismaClient } from '@wedding/db';
import { z } from 'zod';
import { ErrorCode, createMessageSchema, paginationSchema } from '@wedding/shared';
import { validate } from '../middleware/validate';

interface MessageRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function messageRoutes(app: FastifyInstance, opts: MessageRouteOptions) {
  const { prisma } = opts;

  // POST /messages - Submit a message (public, no auth required)
  app.post('/', async (request: FastifyRequest, reply) => {
    const fullSchema = createMessageSchema.extend({
      event_id: z.string().uuid({ message: 'ID event tidak valid' }),
      guest_id: z.string().uuid({ message: 'ID tamu tidak valid' }).optional(),
    });

    const body = validate(request.body, fullSchema, reply);
    if (!body) return reply;

    // Verify event exists
    const event = await prisma.event.findFirst({
      where: { id: body.event_id },
      select: { id: true },
    });

    if (!event) {
      return reply.status(404).send({
        success: false,
        error: { code: ErrorCode.NOT_FOUND, message: 'Event tidak ditemukan' },
      });
    }

    const { randomUUID } = await import('crypto');
    const message = await prisma.message.create({
      data: {
        id: randomUUID(),
        event_id: body.event_id,
        guest_id: body.guest_id || null,
        sender_name: body.sender_name,
        message_text: body.message_text,
        is_visible: true,
        created_at: new Date(),
      },
    });

    return reply.status(201).send(message);
  });

  // GET /messages/:eventId - Get messages for an event (public, paginated)
  app.get('/:eventId', async (request: FastifyRequest, reply) => {
    const paramsSchema = z.object({
      eventId: z.string().uuid({ message: 'ID event tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const query = validate(request.query, paginationSchema, reply);
    if (!query) return reply;

    const skip = (query.page! - 1) * query.per_page!;

    // Verify event exists
    const event = await prisma.event.findFirst({
      where: { id: params.eventId },
      select: { id: true },
    });

    if (!event) {
      return reply.status(404).send({
        success: false,
        error: { code: ErrorCode.NOT_FOUND, message: 'Event tidak ditemukan' },
      });
    }

    const [total, messages] = await Promise.all([
      prisma.message.count({
        where: { event_id: params.eventId, is_visible: true },
      }),
      prisma.message.findMany({
        where: { event_id: params.eventId, is_visible: true },
        orderBy: { created_at: 'desc' },
        skip,
        take: query.per_page!,
      }),
    ]);

    return reply.send({
      data: messages,
      pagination: {
        page: query.page!,
        per_page: query.per_page!,
        total,
        total_pages: Math.ceil(total / query.per_page!),
      },
    });
  });

  // GET /messages/:eventId/admin - Get all messages for an event (including hidden ones, auth required)
  app.get(
    '/:eventId/admin',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const user = request.user!;
      const paramsSchema = z.object({
        eventId: z.string().uuid({ message: 'ID event tidak valid' }),
      });

      const params = validate(request.params, paramsSchema, reply);
      if (!params) return reply;

      // Verify event exists and belongs to tenant
      const event = await prisma.event.findFirst({
        where: { id: params.eventId, tenant_id: user.tenant_id },
        select: { id: true },
      });

      if (!event) {
        return reply.status(404).send({
          success: false,
          error: { code: ErrorCode.NOT_FOUND, message: 'Event tidak ditemukan' },
        });
      }

      const query = validate(request.query, paginationSchema, reply);
      if (!query) return reply;

      const skip = (query.page! - 1) * query.per_page!;

      const [total, messages] = await Promise.all([
        prisma.message.count({
          where: { event_id: params.eventId },
        }),
        prisma.message.findMany({
          where: { event_id: params.eventId },
          include: {
            guest: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: query.per_page!,
        }),
      ]);

      return reply.send({
        data: messages,
        pagination: {
          page: query.page!,
          per_page: query.per_page!,
          total,
          total_pages: Math.ceil(total / query.per_page!),
        },
      });
    }
  );

  // PUT /messages/:id/visibility - Toggle wish visibility (auth required)
  app.put(
    '/:id/visibility',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const user = request.user!;
      const paramsSchema = z.object({
        id: z.string().uuid({ message: 'ID ucapan tidak valid' }),
      });

      const params = validate(request.params, paramsSchema, reply);
      if (!params) return reply;

      const bodySchema = z.object({
        is_visible: z.boolean({ message: 'Status visibilitas harus boolean' }),
      });

      const body = validate(request.body, bodySchema, reply);
      if (!body) return reply;

      // Find message and check tenant ownership via event relation
      const message = await prisma.message.findFirst({
        where: {
          id: params.id,
          event: {
            tenant_id: user.tenant_id,
          },
        },
        select: { id: true },
      });

      if (!message) {
        return reply.status(404).send({
          success: false,
          error: { code: ErrorCode.NOT_FOUND, message: 'Ucapan tidak ditemukan' },
        });
      }

      const updated = await prisma.message.update({
        where: { id: params.id },
        data: { is_visible: body.is_visible },
      });

      return reply.send(updated);
    }
  );

  // DELETE /messages/:id - Delete a wish (auth required)
  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const user = request.user!;
      const paramsSchema = z.object({
        id: z.string().uuid({ message: 'ID ucapan tidak valid' }),
      });

      const params = validate(request.params, paramsSchema, reply);
      if (!params) return reply;

      // Find message and check tenant ownership via event relation
      const message = await prisma.message.findFirst({
        where: {
          id: params.id,
          event: {
            tenant_id: user.tenant_id,
          },
        },
        select: { id: true },
      });

      if (!message) {
        return reply.status(404).send({
          success: false,
          error: { code: ErrorCode.NOT_FOUND, message: 'Ucapan tidak ditemukan' },
        });
      }

      await prisma.message.delete({
        where: { id: params.id },
      });

      return reply.send({ success: true });
    }
  );
}
