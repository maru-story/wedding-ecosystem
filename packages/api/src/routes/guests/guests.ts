/**
 * Guest route handlers — thin adapters over GuestService and GuestImportService.
 *
 * Routes handle only:
 * - Input extraction and basic validation
 * - Calling the service
 * - Mapping service results to HTTP responses
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@wedding/db';
import { z } from 'zod';
import { GuestService, isGuestError } from '../../services/guest/guest.service';
import { bulkImportGuests } from '../../services/guest-import/guest-import.service';
import {
  PrismaGuestRepository,
  getCurrentTenantEvent,
  replyEventNotFound,
} from '../../repositories';
import {
  createGuestSchema,
  updateGuestSchema,
  paginationSchema,
  guestSearchSchema,
  bulkDeleteGuestsSchema,
  GuestGroup,
  ErrorCode,
} from '@wedding/shared';
import { validate } from '../../middleware/validate';

interface GuestRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function guestRoutes(app: FastifyInstance, opts: GuestRouteOptions) {
  const { prisma } = opts;

  // --- Wire up GuestService with its Prisma adapter ---
  const repository = new PrismaGuestRepository(prisma);
  const encryptionKey = process.env.ENCRYPTION_KEY_AES256 || process.env.AES_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '';
  const guestService = new GuestService({ repository, encryptionKey });

  // Auth hook for all guest routes
  app.addHook('onRequest', app.authenticate);

  // GET /guests
  app.get('/', async (request, reply) => {
    const user = request.user!;
    const query = validate(
      request.query,
      paginationSchema.extend({
        group: z.nativeEnum(GuestGroup).optional(),
        status: z.enum(['belum_rsvp', 'confirmed', 'declined', 'checked_in']).optional(),
        q: z.string().optional(),
        include: z.string().optional(),
      }),
      reply
    );

    // Fallback if validation failed (reply already sent)
    if (!query) return reply;

    // Resolve the current event for this tenant
    const event = await getCurrentTenantEvent(prisma, user.tenant_id);
    if (!event) {
      return reply.send({
        data: [],
        pagination: { page: 1, per_page: 50, total: 0, total_pages: 0 },
      });
    }

    const result = await guestService.listGuests(
      event.id,
      user.tenant_id,
      {
        page: query.page!,
        per_page: query.per_page!,
      },
      {
        group: query.group,
        status: query.status,
        q: query.q,
      }
    );

    if (isGuestError(result)) {
      return reply.status(404).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    // Notifications page requests a flat delivery-status focused shape
    if (query.include === 'delivery_status') {
      return reply.send({
        data: result.data.map((guest) => ({
          id: guest.id,
          name: guest.name,
          slug: guest.slug,
          phone: guest.phone,
          delivery_status: guest.delivery_status,
          invitation_url: guest.invitation_url,
        })),
        pagination: result.pagination,
      });
    }

    return reply.send(result);
  });

  // POST /guests
  app.post('/', async (request, reply) => {
    const user = request.user!;
    const body = validate(
      request.body,
      createGuestSchema.extend({
        event_id: z.string().uuid().optional(),
      }),
      reply
    );

    if (!body) return reply;

    // Resolve event
    let eventId = body.event_id;
    if (!eventId) {
      const event = await getCurrentTenantEvent(prisma, user.tenant_id);
      if (!event) return replyEventNotFound(reply);
      eventId = event.id;
    }

    const result = await guestService.addGuest(eventId, user.tenant_id, {
      name: body.name,
      group: body.group,
      type: body.type!,
      phone: body.phone,
      plus_one_count: body.plus_one_count!,
    });

    if (isGuestError(result)) {
      let status = 400;
      if (result.code === 'RES_5001') {
        status = 404;
      } else if (result.code === ErrorCode.GUEST_LIMIT_EXCEEDED) {
        status = 403;
      }
      return reply.status(status).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.status(201).send(result);
  });

  // PUT /guests/:id
  app.put('/:id', async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = validate(request.body, updateGuestSchema, reply);
    if (!body) return reply;

    const result = await guestService.updateGuest(id, user.tenant_id, body);

    if (isGuestError(result)) {
      return reply.status(404).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.send(result);
  });

  // DELETE /guests/:id
  app.delete('/:id', async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const result = await guestService.deleteGuest(id, user.tenant_id);

    if (isGuestError(result)) {
      return reply.status(404).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.send(result);
  });

  // POST /guests/bulk-delete
  app.post('/bulk-delete', async (request, reply) => {
    const user = request.user!;
    const body = validate(request.body, bulkDeleteGuestsSchema, reply);
    if (!body) return reply;

    const result = await guestService.deleteGuests(body.ids, user.tenant_id);

    return reply.send(result);
  });

  // GET /guests/:id/qr
  app.get('/:id/qr', async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const result = await guestService.getGuest(id, user.tenant_id);

    if (isGuestError(result)) {
      return reply.status(404).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    const qr = result.qr_code;
    const qr_payload = qr?.qr_payload ?? null;
    return reply.send({
      qr_payload,
      is_active: qr?.is_active ?? false,
    });
  });

  // GET /guests/search
  app.get('/search', async (request, reply) => {
    const user = request.user!;
    const query = validate(
      request.query,
      guestSearchSchema.omit({ event_id: true }).extend({
        event_id: z.string().uuid().optional(),
      }),
      reply
    );
    if (!query) return reply;

    // Resolve event context
    let eventId = query.event_id;
    if (!eventId) {
      const event = await getCurrentTenantEvent(prisma, user.tenant_id);
      if (!event) return replyEventNotFound(reply);
      eventId = event.id;
    }

    const result = await guestService.searchGuests(eventId, user.tenant_id, query.q);

    if (!Array.isArray(result) && isGuestError(result)) {
      return reply.status(400).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.send({ data: result });
  });

  // POST /guests/import
  app.post('/import', async (request, reply) => {
    const user = request.user!;
    const body = request.body as { csv_text?: string; event_id?: string };

    if (!body.csv_text) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_4001', message: 'csv_text diperlukan' },
      });
    }

    // Resolve event context
    let eventId = body.event_id;
    if (!eventId) {
      const event = await getCurrentTenantEvent(prisma, user.tenant_id);
      if (!event) return replyEventNotFound(reply);
      eventId = event.id;
    }

    // Pre-fetch existing guest names
    const existingNames = await repository.findGuestNamesByEvent(eventId, user.tenant_id);

    const report = await bulkImportGuests(
      { eventId, tenantId: user.tenant_id, csvText: body.csv_text },
      guestService,
      existingNames
    );

    return reply.send({
      imported: report.successCount,
      errors: report.failedRows.length,
      details: report.failedRows,
    });
  });
}
