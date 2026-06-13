import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { PrismaClient } from '@wedding/db';
import type { RealtimeServer } from '@wedding/realtime';
import { z } from 'zod';
import { ErrorCode, createRsvpSchema } from '@wedding/shared';
import { RsvpService, isRsvpError } from '../services/rsvp/rsvp.service';
import { PrismaRsvpRepository, RealtimeRsvpBroadcaster } from '../repositories';
import { validate } from '../middleware/validate';

interface RsvpRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
  realtime?: RealtimeServer | null;
  getRealtimeServer?: () => RealtimeServer | null;
}

export async function rsvpRoutes(app: FastifyInstance, opts: RsvpRouteOptions) {
  const { prisma, realtime, getRealtimeServer } = opts;

  // Wire up service
  const repository = new PrismaRsvpRepository(prisma);
  const broadcaster = new RealtimeRsvpBroadcaster(getRealtimeServer || (() => realtime ?? null));
  const rsvpService = new RsvpService({ repository, broadcaster });

  // POST /rsvp - Submit or update RSVP (public route, no auth required)
  app.post('/', async (request, reply) => {
    // Combine base RSVP schema with required public fields
    const fullSchema = z
      .object({
        guest_id: z.string().uuid({ message: 'ID tamu tidak valid' }),
        event_id: z.string().uuid({ message: 'ID event tidak valid' }),
      })
      .and(createRsvpSchema);

    const body = validate(request.body, fullSchema, reply);
    if (!body) return reply;

    const result = await rsvpService.submitRsvp(body.guest_id, body.event_id, {
      attendance: body.attendance,
      guest_count: body.guest_count,
    });

    if (isRsvpError(result)) {
      const statusCode = result.code === ErrorCode.GUEST_NOT_FOUND ? 404 : 400;
      return reply.status(statusCode).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.send({
      success: true,
      rsvp: {
        id: result.id,
        guest_id: result.guest_id,
        attendance: result.attendance,
        guest_count: result.guest_count,
        submitted_at: result.submitted_at.toISOString(),
      },
    });
  });

  // GET /rsvp/:guestId - Get RSVP status for a guest (public)
  app.get('/:guestId', async (request: FastifyRequest, reply) => {
    const paramsSchema = z.object({
      guestId: z.string().uuid({ message: 'ID tamu tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const rsvp = await repository.findRsvpByGuestId(params.guestId);

    if (!rsvp) {
      return reply.status(404).send({
        success: false,
        error: { code: ErrorCode.NOT_FOUND, message: 'RSVP belum disubmit' },
      });
    }

    return reply.send({
      id: rsvp.id,
      guest_id: rsvp.guest_id,
      attendance: rsvp.attendance,
      guest_count: rsvp.guest_count,
      submitted_at: rsvp.submitted_at.toISOString(),
    });
  });
}
