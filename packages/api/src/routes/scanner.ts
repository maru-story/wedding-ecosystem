import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@wedding/db';
import { z } from 'zod';
import { ErrorCode, registerScannerSchema } from '@wedding/shared';
import { getTenantEvent, replyEventNotFound } from '../repositories';
import { validate } from '../middleware/validate';

interface ScannerRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function scannerRoutes(app: FastifyInstance, opts: ScannerRouteOptions) {
  const { prisma } = opts;

  // Auth hook for all scanner routes
  app.addHook('onRequest', app.authenticate);

  // POST /scanner/devices/register - Register a scanner device
  app.post('/devices/register', async (request, reply) => {
    const user = request.user!;
    const body = validate(request.body, registerScannerSchema, reply);
    if (!body) return reply;

    // Verify event belongs to tenant
    const event = await getTenantEvent(prisma, body.event_id, user.tenant_id);
    if (!event) return replyEventNotFound(reply);

    // Check active device count (max 2 per event)
    const activeDevices = await prisma.scannerDevice.count({
      where: { event_id: body.event_id, is_active: true },
    });

    if (activeDevices >= 2) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'SCANNER_7001',
          message: 'Batas maksimal 2 scanner device per event telah tercapai',
        },
      });
    }

    // Create scanner device
    const { randomUUID } = await import('crypto');
    const device = await prisma.scannerDevice.create({
      data: {
        id: randomUUID(),
        event_id: body.event_id,
        device_name: body.device_name,
        lane: body.lane,
        is_active: true,
        last_active_at: new Date(),
      },
    });

    return reply.status(201).send(device);
  });

  // PUT /scanner/devices/:deviceId/heartbeat - Update device heartbeat
  app.put('/devices/:deviceId/heartbeat', async (request, reply) => {
    const user = request.user!;
    const paramsSchema = z.object({
      deviceId: z.string().uuid({ message: 'ID device tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const device = await prisma.scannerDevice.findFirst({
      where: { id: params.deviceId },
      include: { event: true },
    });

    if (!device || device.event.tenant_id !== user.tenant_id) {
      return reply.status(404).send({
        success: false,
        error: { code: ErrorCode.NOT_FOUND, message: 'Device tidak ditemukan' },
      });
    }

    const updated = await prisma.scannerDevice.update({
      where: { id: params.deviceId },
      data: { last_active_at: new Date() },
    });

    return reply.send(updated);
  });

  // DELETE /scanner/devices/:deviceId - Deactivate a scanner device
  app.delete('/devices/:deviceId', async (request, reply) => {
    const user = request.user!;
    const paramsSchema = z.object({
      deviceId: z.string().uuid({ message: 'ID device tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const device = await prisma.scannerDevice.findFirst({
      where: { id: params.deviceId },
      include: { event: true },
    });

    if (!device || device.event.tenant_id !== user.tenant_id) {
      return reply.status(404).send({
        success: false,
        error: { code: ErrorCode.NOT_FOUND, message: 'Device tidak ditemukan' },
      });
    }

    const updated = await prisma.scannerDevice.update({
      where: { id: params.deviceId },
      data: { is_active: false },
    });

    return reply.send({ success: true, device: updated });
  });

  // GET /scanner/devices/:eventId - List active scanner devices for an event
  app.get('/devices/:eventId', async (request, reply) => {
    const user = request.user!;
    const paramsSchema = z.object({
      eventId: z.string().uuid({ message: 'ID event tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const event = await getTenantEvent(prisma, params.eventId, user.tenant_id);
    if (!event) return replyEventNotFound(reply);

    const devices = await prisma.scannerDevice.findMany({
      where: { event_id: params.eventId, is_active: true },
      orderBy: { last_active_at: 'desc' },
    });

    return reply.send({ data: devices });
  });

  // GET /scanner/guests/:eventId - Get guest cache for offline use
  app.get('/guests/:eventId', async (request, reply) => {
    const user = request.user!;
    const paramsSchema = z.object({
      eventId: z.string().uuid({ message: 'ID event tidak valid' }),
    });

    const params = validate(request.params, paramsSchema, reply);
    if (!params) return reply;

    const event = await getTenantEvent(prisma, params.eventId, user.tenant_id);
    if (!event) return replyEventNotFound(reply);

    // Return guest data for offline cache (name, QR payload, check-in status)
    const guests = await prisma.guest.findMany({
      where: { event_id: params.eventId },
      include: {
        qr_codes: { where: { is_active: true }, take: 1 },
        check_ins: { take: 1 },
      },
    });

    const data = guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      group: guest.group,
      type: guest.type,
      qr_payload: guest.qr_codes[0]?.qr_payload || null,
      is_checked_in: guest.check_ins.length > 0,
      checked_in_at: guest.check_ins[0]?.checked_in_at?.toISOString() || null,
    }));

    return reply.send({ data, cached_at: new Date().toISOString() });
  });
}
