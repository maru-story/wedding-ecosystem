import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@wedding/db';
import { createEventSchema, updateEventSchema, ErrorCode, EventStatus } from '@wedding/shared';
import { EventService, isEventError } from '../services/event/event.service';
import { PrismaEventRepository } from '../repositories';
import { validate } from '../middleware/validate';
import {
  MediaUploadService,
  isMediaUploadError,
} from '../services/media-upload/media-upload.service';
import { createCloudStorage } from '../services/media-upload/r2-storage';
import { getHttpStatusForError } from '../middleware/media-upload/media-upload.middleware';
import { PIIEncryption } from '../middleware/encryption/encryption';

interface EventRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function eventRoutes(app: FastifyInstance, opts: EventRouteOptions) {
  const { prisma } = opts;

  // --- Wire up EventService ---
  const repository = new PrismaEventRepository(prisma);
  const eventService = new EventService({ repository });
  const mediaUploadService = new MediaUploadService({
    cloudStorage: createCloudStorage(),
  });

  const encryptionKey =
    process.env.ENCRYPTION_KEY_AES256 ||
    process.env.AES_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    '';
  let pii: PIIEncryption | null = null;
  if (encryptionKey) {
    try {
      pii = new PIIEncryption({ encryptionKey });
    } catch (e) {
      app.log.error(e, 'Failed to initialize PIIEncryption for events rsvp route');
    }
  }

  // Auth hook for all event routes
  app.addHook('onRequest', app.authenticate);

  /**
   * POST /events - Create a new wedding event
   * Req 1.4: Multi-event support (max 50 per tenant)
   * Req 11.7: Default theme applied automatically
   * Req 5.10: 16 sections initialized automatically
   */
  app.post('/', async (request, reply) => {
    const user = request.user!;
    const body = validate(request.body, createEventSchema, reply);
    if (!body) return reply;

    const result = await eventService.createEvent(user.tenant_id, {
      ...body,
      status: body.status ?? EventStatus.DRAFT,
    });

    if (isEventError(result)) {
      return reply.status(result.code === ErrorCode.ALREADY_EXISTS ? 409 : 400).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.status(201).send(result);
  });

  // GET /events - List all events for a tenant
  app.get('/', async (request, reply) => {
    const user = request.user!;
    const events = await prisma.event.findMany({
      where: { tenant_id: user.tenant_id },
      include: {
        scanner_devices: {
          where: { is_active: true },
        },
        _count: {
          select: {
            guests: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return reply.send({ data: events });
  });

  // GET /events/current
  app.get('/current', async (request, reply) => {
    const user = request.user!;

    const event = await prisma.event.findFirst({
      where: { tenant_id: user.tenant_id },
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

    if (!event) {
      return reply.status(404).send({
        success: false,
        error: { code: 'RES_5001', message: 'Event tidak ditemukan' },
      });
    }

    return reply.send(event);
  });
  async function getDetailedEventStats(id: string, tenantId: string) {
    const guests = await prisma.guest.findMany({
      where: { event_id: id, tenant_id: tenantId },
      select: {
        group: true,
        type: true,
        delivery_status: true,
        plus_one_count: true,
        rsvps: {
          select: {
            attendance: true,
            guest_count: true,
            submitted_at: true,
          },
        },
        check_ins: {
          select: {
            checked_in_at: true,
            scan_count: true,
          },
        },
      },
    });

    const [total_wishes, visible_wishes] = await Promise.all([
      prisma.message.count({ where: { event_id: id } }),
      prisma.message.count({ where: { event_id: id, is_visible: true } }),
    ]);

    const total_guests = guests.length;
    const total_go_show = guests.filter((g) => g.type === 'go_show').length;
    const total_rsvp = guests.filter((g) => g.rsvps.length > 0).length;
    const total_checked_in = guests.filter((g) => g.check_ins.length > 0).length;

    const rsvp_confirmed = guests.filter(
      (g) => g.rsvps.length > 0 && g.rsvps[0].attendance !== 'decline'
    ).length;
    const rsvp_declined = guests.filter(
      (g) => g.rsvps.length > 0 && g.rsvps[0].attendance === 'decline'
    ).length;
    const rsvp_pending = guests.filter((g) => g.rsvps.length === 0).length;

    const total_pax_invited = guests.reduce((sum, g) => sum + 1 + g.plus_one_count, 0);
    const total_pax_checked_in = guests.reduce((sum, g) => {
      if (g.check_ins.length === 0) return sum;
      const maxCapacity = 1 + g.plus_one_count;
      const actualCheckedIn = Math.min(g.check_ins[0].scan_count, maxCapacity);
      return sum + actualCheckedIn;
    }, 0);
    const total_pax_confirmed = guests.reduce((sum, g) => {
      if (g.rsvps.length > 0 && g.rsvps[0].attendance !== 'decline') {
        return sum + g.rsvps[0].guest_count;
      }
      return sum;
    }, 0);

    const attendance_akad = guests.filter(
      (g) => g.rsvps.length > 0 && g.rsvps[0].attendance === 'akad'
    ).length;
    const attendance_resepsi = guests.filter(
      (g) => g.rsvps.length > 0 && g.rsvps[0].attendance === 'resepsi'
    ).length;
    const attendance_both = guests.filter(
      (g) => g.rsvps.length > 0 && g.rsvps[0].attendance === 'both'
    ).length;

    const checked_in_invited = guests.filter(
      (g) => g.check_ins.length > 0 && g.type === 'invited'
    ).length;
    const checked_in_go_show = guests.filter(
      (g) => g.check_ins.length > 0 && g.type === 'go_show'
    ).length;

    const delivery_sent = guests.filter((g) => g.delivery_status === 'sent').length;
    const delivery_not_sent = guests.filter((g) => g.delivery_status === 'not_sent').length;
    const delivery_failed = guests.filter((g) => g.delivery_status === 'failed').length;

    const vip_total = guests.filter((g) => g.group?.toLowerCase() === 'vip').length;
    const vip_confirmed = guests.filter(
      (g) => g.group?.toLowerCase() === 'vip' && g.rsvps.length > 0 && g.rsvps[0].attendance !== 'decline'
    ).length;
    const vip_checked_in = guests.filter((g) => g.group?.toLowerCase() === 'vip' && g.check_ins.length > 0).length;

    // Group breakdown — dynamic based on all groups present in the guest list,
    // plus default to the standard ones to ensure the dashboard looks complete.
    const standardGroups = ['Keluarga', 'Teman', 'Rekan Kerja', 'VIP'];

    // Normalize group keys to avoid duplicates (like 'vip' and 'VIP') when grouping.
    // If a guest group matches any of the legacy English ones, we can group it under the standard Indonesian name.
    const normalizeGroup = (grp: string): string => {
      const normalized = grp.trim();
      const lower = normalized.toLowerCase();
      if (lower === 'family') return 'Keluarga';
      if (['friend', 'teman', 'kawan', 'sahabat'].includes(lower)) return 'Teman';
      if (['colleague', 'rekan', 'kerja', 'kantor', 'rekan kerja'].includes(lower)) return 'Rekan Kerja';
      if (lower === 'vip') return 'VIP';
      return normalized;
    };

    const group_breakdown: Record<string, any> = {};

    // Initialize standard groups
    standardGroups.forEach((grp) => {
      group_breakdown[grp] = {
        total: 0,
        confirmed: 0,
        declined: 0,
        pending: 0,
        checked_in: 0,
      };
    });

    guests.forEach((g) => {
      if (!g.group || g.group.trim() === '') {
        return;
      }
      const grp = normalizeGroup(g.group);
      if (!group_breakdown[grp]) {
        group_breakdown[grp] = {
          total: 0,
          confirmed: 0,
          declined: 0,
          pending: 0,
          checked_in: 0,
        };
      }

      const stats = group_breakdown[grp];
      stats.total += 1;

      if (g.rsvps.length > 0) {
        if (g.rsvps[0].attendance === 'decline') {
          stats.declined += 1;
        } else {
          stats.confirmed += 1;
        }
      } else {
        stats.pending += 1;
      }

      if (g.check_ins.length > 0) {
        stats.checked_in += 1;
      }
    });

    // Remove empty groups (total === 0) from the breakdown
    Object.keys(group_breakdown).forEach((grp) => {
      if (group_breakdown[grp].total === 0) {
        delete group_breakdown[grp];
      }
    });

    // RSVP Trend (cumulative)
    const rsvpSubmissions = guests
      .filter((g) => g.rsvps.length > 0)
      .map((g) => g.rsvps[0].submitted_at);
    const rsvpCountsByDate: Record<string, number> = {};
    rsvpSubmissions.forEach((date) => {
      const dayStr = date.toISOString().split('T')[0];
      rsvpCountsByDate[dayStr] = (rsvpCountsByDate[dayStr] || 0) + 1;
    });
    const sortedDates = Object.keys(rsvpCountsByDate).sort();
    let cumulative = 0;
    const rsvp_trend = sortedDates.map((date) => {
      cumulative += rsvpCountsByDate[date];
      return { date, count: cumulative };
    });

    // Check-in Peak Times (WIB UTC+7)
    const checkInTimes = guests
      .filter((g) => g.check_ins.length > 0)
      .map((g) => g.check_ins[0].checked_in_at);
    const checkInIntervals: Record<string, number> = {};
    checkInTimes.forEach((time) => {
      const dateWib = new Date(time.getTime() + 7 * 60 * 60 * 1000);
      const hours = dateWib.getUTCHours().toString().padStart(2, '0');
      const minutes = dateWib.getUTCMinutes();
      const slotMinute = minutes < 30 ? '00' : '30';
      const slot = `${hours}:${slotMinute}`;
      checkInIntervals[slot] = (checkInIntervals[slot] || 0) + 1;
    });
    const sortedSlots = Object.keys(checkInIntervals).sort();
    const checkin_peak = sortedSlots.map((timeSlot) => ({
      timeSlot,
      count: checkInIntervals[timeSlot],
    }));

    return {
      total_guests,
      total_rsvp,
      total_checked_in,
      total_go_show,
      rsvp_confirmed,
      rsvp_declined,
      rsvp_pending,
      total_pax_invited,
      total_pax_confirmed,
      total_pax_checked_in,
      attendance_akad,
      attendance_resepsi,
      attendance_both,
      checked_in_invited,
      checked_in_go_show,
      delivery_sent,
      delivery_not_sent,
      delivery_failed,
      vip_total,
      vip_confirmed,
      vip_checked_in,
      total_wishes,
      visible_wishes,
      rsvp_trend,
      checkin_peak,
      group_breakdown,
    };
  }

  // GET /events/current/stats
  app.get('/current/stats', async (request, reply) => {
    const user = request.user!;

    const event = await prisma.event.findFirst({
      where: { tenant_id: user.tenant_id },
      orderBy: { created_at: 'desc' },
    });

    if (!event) {
      return reply.status(404).send({
        success: false,
        error: { code: 'RES_5001', message: 'Event tidak ditemukan' },
      });
    }

    const stats = await getDetailedEventStats(event.id, user.tenant_id);
    return reply.send(stats);
  });

  // GET /events/:id/stats
  app.get('/:id/stats', async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const event = await prisma.event.findFirst({
      where: { id, tenant_id: user.tenant_id },
    });

    if (!event) {
      return reply.status(404).send({
        success: false,
        error: { code: 'RES_5001', message: 'Event tidak ditemukan' },
      });
    }

    const stats = await getDetailedEventStats(event.id, user.tenant_id);
    return reply.send(stats);
  });

  // GET /events/:id/rsvp
  app.get('/:id/rsvp', async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const event = await prisma.event.findFirst({
      where: { id, tenant_id: user.tenant_id },
    });

    if (!event) {
      return reply.status(404).send({
        success: false,
        error: { code: 'RES_5001', message: 'Event tidak ditemukan' },
      });
    }

    const rsvps = await prisma.rSVP.findMany({
      where: { guest: { event_id: id } },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            group: true,
            phone: true,
            delivery_status: true,
          },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });

    const data = rsvps.map((rsvp) => ({
      guest_id: rsvp.guest_id,
      guest_name: rsvp.guest.name,
      attendance: rsvp.attendance,
      guest_count: rsvp.guest_count,
      submitted_at: rsvp.submitted_at.toISOString(),
      group: rsvp.guest.group,
      phone:
        pii && pii.isEncrypted(rsvp.guest.phone) ? pii.decrypt(rsvp.guest.phone) : rsvp.guest.phone,
      delivery_status: rsvp.guest.delivery_status,
    }));

    return reply.send({ data });
  });

  // POST /events/:id/media/upload
  app.post('/:id/media/upload', async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    // Verify event belongs to tenant
    const event = await prisma.event.findFirst({
      where: { id, tenant_id: user.tenant_id },
      include: { tenant: true },
    });

    if (!event) {
      return reply.status(404).send({
        success: false,
        error: { code: 'RES_5001', message: 'Event tidak ditemukan' },
      });
    }

    const { section } = request.query as { section?: string };

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: 'File tidak ditemukan dalam request',
        },
      });
    }

    const buffer = await data.toBuffer();
    const fileInput = {
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
      buffer,
    };

    const result = await mediaUploadService.uploadFile(
      fileInput,
      event.tenant.slug,
      event.slug,
      section
    );

    if (isMediaUploadError(result)) {
      const statusCode = getHttpStatusForError(result.code);
      return reply.status(statusCode).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.status(201).send({
      success: true,
      url: result.url,
      data: {
        url: result.url,
        originalname: result.originalname,
        mimetype: result.mimetype,
        size: result.size,
        category: result.category,
      },
    });
  });

  /**
   * PUT /events/:id - Update event details
   */
  app.put('/:id', async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = validate(request.body, updateEventSchema, reply);
    if (!body) return reply;

    const result = await eventService.updateEvent(id, user.tenant_id, body);

    if (isEventError(result)) {
      return reply.status(result.code === ErrorCode.NOT_FOUND ? 404 : 400).send({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return reply.send({ success: true, data: result });
  });
}
