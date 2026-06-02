import { PrismaClient } from '@wedding/db';
import { DeliveryStatus } from '@wedding/shared';
import {
  InvitationDeliveryRepository,
  InvitationGuest,
  DeliveryLogEntry,
} from '../services/invitation-delivery/invitation-delivery.service';

export class PrismaInvitationDeliveryRepository implements InvitationDeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findGuestById(guestId: string, tenantId: string): Promise<InvitationGuest | null> {
    const guest = await this.prisma.guest.findFirst({
      where: { id: guestId, tenant_id: tenantId },
    });
    if (!guest) return null;
    return {
      id: guest.id,
      event_id: guest.event_id,
      tenant_id: guest.tenant_id,
      name: guest.name,
      slug: guest.slug,
      phone: guest.phone,
      email: null,
      invitation_url: guest.invitation_url,
      delivery_status: guest.delivery_status as DeliveryStatus,
    };
  }

  async findEventConfigByEventId(
    eventId: string,
    tenantId: string
  ): Promise<{ invitation_message_template: string | null } | null> {
    const config = await this.prisma.eventConfig.findFirst({
      where: {
        event_id: eventId,
        event: { tenant_id: tenantId },
      },
      select: { invitation_message_template: true },
    });
    return config;
  }

  async updateEventConfigTemplate(
    eventId: string,
    tenantId: string,
    template: string
  ): Promise<boolean> {
    const config = await this.prisma.eventConfig.findFirst({
      where: {
        event_id: eventId,
        event: { tenant_id: tenantId },
      },
      select: { id: true },
    });
    if (!config) return false;

    await this.prisma.eventConfig.update({
      where: { id: config.id },
      data: { invitation_message_template: template },
    });
    return true;
  }

  async updateDeliveryStatus(
    guestId: string,
    tenantId: string,
    status: DeliveryStatus
  ): Promise<boolean> {
    const guest = await this.prisma.guest.findFirst({
      where: { id: guestId, tenant_id: tenantId },
      select: { id: true },
    });
    if (!guest) return false;

    await this.prisma.guest.update({
      where: { id: guestId },
      data: { delivery_status: status },
    });
    return true;
  }

  async logDeliveryFailure(log: DeliveryLogEntry): Promise<void> {
    // Log warning to server console/logger since there is no separate table for delivery failures
    console.warn(
      `[InvitationDelivery] Delivery failed for guest ${log.guest_id} via ${log.channel}: ${log.error} at ${log.timestamp}`
    );
  }
}
