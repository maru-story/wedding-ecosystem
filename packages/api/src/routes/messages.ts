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
    });

    const body = validate(request.body, fullSchema, reply);
    if (!body) return;

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
    if (!params) return;

    const query = validate(request.query, paginationSchema, reply);
    if (!query) return;

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
}
