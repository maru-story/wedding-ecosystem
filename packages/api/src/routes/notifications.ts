import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@wedding/db';
import { z } from 'zod';
import { ErrorCode, MAX_BULK_SEND } from '@wedding/shared';
import { validate } from '../middleware/validate';

interface NotificationRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function notificationRoutes(app: FastifyInstance, opts: NotificationRouteOptions) {
  const { prisma } = opts;

  // Auth hook for all notification routes
  app.addHook('onRequest', app.authenticate);

  // POST /notifications/send
  app.post('/send', async (request, reply) => {
    const user = request.user!;
    const bodySchema = z.object({
      guest_id: z.string().uuid({ message: 'ID tamu tidak valid' }),
      channel: z.enum(['whatsapp', 'email'], {
        errorMap: () => ({ message: 'Channel harus whatsapp atau email' }),
      }),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return;

    const guest = await prisma.guest.findFirst({
      where: { id: body.guest_id, tenant_id: user.tenant_id },
    });

    if (!guest) {
      return reply.status(404).send({
        success: false,
        error: { code: ErrorCode.NOT_FOUND, message: 'Tamu tidak ditemukan' },
      });
    }

    // Check contact info
    if (body.channel === 'whatsapp' && !guest.phone) {
      return reply.send({
        guest_id: guest.id,
        channel: body.channel,
        success: false,
        error: 'Nomor phone belum dilengkapi',
      });
    }

    if (body.channel === 'email' && !guest.email) {
      return reply.send({
        guest_id: guest.id,
        channel: body.channel,
        success: false,
        error: 'Alamat email belum dilengkapi',
      });
    }

    // Simulate sending (dev mode - always succeeds)
    await prisma.guest.update({
      where: { id: body.guest_id },
      data: { delivery_status: 'sent' },
    });

    return reply.send({
      guest_id: guest.id,
      channel: body.channel,
      success: true,
    });
  });

  // POST /notifications/send-bulk
  app.post('/send-bulk', async (request, reply) => {
    const user = request.user!;
    const bodySchema = z.object({
      guest_ids: z
        .array(z.string().uuid())
        .min(1, { message: 'guest_ids tidak boleh kosong' })
        .max(MAX_BULK_SEND, { message: `Maksimal ${MAX_BULK_SEND} tamu per batch` }),
      channel: z.enum(['whatsapp', 'email'], {
        errorMap: () => ({ message: 'Channel harus whatsapp atau email' }),
      }),
    });

    const body = validate(request.body, bodySchema, reply);
    if (!body) return;

    const guests = await prisma.guest.findMany({
      where: { id: { in: body.guest_ids }, tenant_id: user.tenant_id },
    });

    const results: any[] = [];
    let sent = 0;
    let failed = 0;

    for (const guest of guests) {
      const hasContact = body.channel === 'whatsapp' ? !!guest.phone : !!guest.email;

      if (!hasContact) {
        results.push({
          guest_id: guest.id,
          channel: body.channel,
          success: false,
          error: body.channel === 'whatsapp' ? 'Nomor phone belum dilengkapi' : 'Alamat email belum dilengkapi',
        });
        failed++;
        continue;
      }

      // Simulate sending
      await prisma.guest.update({
        where: { id: guest.id },
        data: { delivery_status: 'sent' },
      });

      results.push({
        guest_id: guest.id,
        channel: body.channel,
        success: true,
      });
      sent++;
    }

    // Add results for guests not found
    const foundIds = new Set(guests.map((g) => g.id));
    for (const guestId of body.guest_ids) {
      if (!foundIds.has(guestId)) {
        results.push({
          guest_id: guestId,
          channel: body.channel,
          success: false,
          error: 'Tamu tidak ditemukan',
        });
        failed++;
      }
    }

    return reply.send({
      total: body.guest_ids.length,
      sent,
      failed,
      results,
    });
  });
}
