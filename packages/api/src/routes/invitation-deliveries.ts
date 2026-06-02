import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@wedding/db';
import { z } from 'zod';
import { ErrorCode } from '@wedding/shared';
import { validate } from '../middleware/validate';
import {
  InvitationDeliveryService,
  isInvitationDeliveryError,
} from '../services/invitation-delivery/invitation-delivery.service';
import { PrismaInvitationDeliveryRepository } from '../repositories/invitation-delivery.repository';

interface RouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function invitationDeliveryRoutes(app: FastifyInstance, opts: RouteOptions) {
  const { prisma } = opts;

  // Instantiate repository and service
  const repository = new PrismaInvitationDeliveryRepository(prisma);
  const whatsappProvider = {
    send: async () => ({ success: true }),
  };
  const emailProvider = {
    send: async () => ({ success: true }),
  };
  const invitationOrigin = process.env.INVITATION_ORIGIN || 'http://localhost:3001';

  const service = new InvitationDeliveryService({
    repository,
    whatsappProvider,
    emailProvider,
    invitationOrigin,
  });

  // Auth hook for all invitation delivery routes
  app.addHook('onRequest', app.authenticate);

  /**
   * Helper to retrieve the current active event for a tenant
   */
  async function getCurrentEvent(tenantId: string, reply: any) {
    const event = await prisma.event.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
    if (!event) {
      reply.status(404).send({
        success: false,
        error: { code: ErrorCode.NOT_FOUND, message: 'Event aktif tidak ditemukan' },
      });
      return null;
    }
    return event;
  }

  // GET /invitation-deliveries/message-template
  app.get('/message-template', async (request, reply) => {
    const user = request.user!;
    const event = await getCurrentEvent(user.tenant_id, reply);
    if (!event) return;

    const template = await service.getMessageTemplate(event.id, user.tenant_id);
    return reply.send({
      success: true,
      data: {
        template,
      },
    });
  });

  // PUT /invitation-deliveries/message-template
  app.put('/message-template', async (request, reply) => {
    const user = request.user!;
    const event = await getCurrentEvent(user.tenant_id, reply);
    if (!event) return;

    const bodySchema = z.object({
      template: z
        .string()
        .min(1, { message: 'Template tidak boleh kosong' })
        .max(1000, { message: 'Template maksimal 1000 karakter' }),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    const success = await service.updateMessageTemplate(event.id, user.tenant_id, body.template);
    if (!success) {
      return reply.status(500).send({
        success: false,
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Gagal memperbarui template' },
      });
    }

    return reply.send({
      success: true,
    });
  });

  // POST /invitation-deliveries/send
  app.post('/send', async (request, reply) => {
    const user = request.user!;
    const event = await getCurrentEvent(user.tenant_id, reply);
    if (!event) return;

    const bodySchema = z.object({
      guest_id: z.string().uuid({ message: 'ID tamu tidak valid' }),
      channel: z.enum(['whatsapp'], {
        errorMap: () => ({ message: 'Channel harus whatsapp' }),
      }),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return reply;

    const result = await service.sendInvitation(
      { guest_id: body.guest_id, channel: body.channel },
      event.id,
      user.tenant_id
    );

    if (isInvitationDeliveryError(result)) {
      const status = result.code === ErrorCode.NOT_FOUND ? 404 : 400;
      return reply.status(status).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.send({
      success: true,
      data: result,
    });
  });
}
