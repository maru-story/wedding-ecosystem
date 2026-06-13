import { PrismaClient } from '@wedding/db';
import { EventStatus, SectionType } from '@wedding/shared';
import type {
  EventRepository,
  EventRecord,
  EventConfigRecord,
  SectionRecord,
} from '../../services/event/event.service';

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEvent(data: {
    id: string;
    tenant_id: string;
    slug: string;
    bride_name: string;
    groom_name: string;
    event_date: Date;
    venue_name: string;
    venue_address: string;
    venue_maps_url: string;
    akad_start: string;
    akad_end: string;
    resepsi_start: string;
    resepsi_end: string;
    status: EventStatus;
  }): Promise<EventRecord> {
    const event = await this.prisma.event.create({
      data: {
        id: data.id,
        tenant_id: data.tenant_id,
        slug: data.slug,
        bride_name: data.bride_name,
        groom_name: data.groom_name,
        event_date: data.event_date,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        venue_maps_url: data.venue_maps_url,
        akad_start: data.akad_start,
        akad_end: data.akad_end,
        resepsi_start: data.resepsi_start,
        resepsi_end: data.resepsi_end,
        status: data.status,
      },
    });
    return {
      ...event,
      status: event.status as EventStatus,
    };
  }

  async createEventConfig(data: {
    id: string;
    event_id: string;
    theme_config: any;
    active_sections: SectionType[];
    invitation_music_url: string | null;
    calendar_link: string | null;
    max_scanner_devices: number;
    max_guests: number;
  }): Promise<EventConfigRecord> {
    const config = await this.prisma.eventConfig.create({
      data: {
        id: data.id,
        event_id: data.event_id,
        theme_config: data.theme_config,
        active_sections: data.active_sections,
        invitation_music_url: data.invitation_music_url,
        calendar_link: data.calendar_link,
        max_scanner_devices: data.max_scanner_devices,
        max_guests: data.max_guests,
      },
    });

    return {
      ...config,
      theme_config: config.theme_config as any,
      active_sections: config.active_sections as any as SectionType[],
    };
  }

  async createSection(data: {
    id: string;
    event_id: string;
    section_type: SectionType;
    sort_order: number;
    is_active: boolean;
    content: Record<string, unknown>;
  }): Promise<SectionRecord> {
    const section = await this.prisma.invitationSection.create({
      data: {
        id: data.id,
        event_id: data.event_id,
        section_type: data.section_type,
        sort_order: data.sort_order,
        is_active: data.is_active,
        content: data.content as any,
      },
    });

    return {
      ...section,
      section_type: section.section_type as SectionType,
      content: section.content as Record<string, unknown>,
    };
  }

  async findEventBySlug(slug: string): Promise<EventRecord | null> {
    const event = await this.prisma.event.findUnique({
      where: { slug },
    });
    if (!event) return null;
    return {
      ...event,
      status: event.status as EventStatus,
    };
  }

  async findEventById(eventId: string, tenantId: string): Promise<EventRecord | null> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenant_id: tenantId },
    });
    if (!event) return null;
    return {
      ...event,
      status: event.status as EventStatus,
    };
  }

  async countEventsByTenant(tenantId: string): Promise<number> {
    return this.prisma.event.count({
      where: { tenant_id: tenantId },
    });
  }

  async findTenantPlan(tenantId: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan_type: true },
    });
    return tenant ? tenant.plan_type : null;
  }

  async updateEvent(
    eventId: string,
    tenantId: string,
    data: Partial<EventRecord>
  ): Promise<EventRecord | null> {
    const result = await this.prisma.event.updateMany({
      where: { id: eventId, tenant_id: tenantId },
      data: {
        slug: data.slug,
        bride_name: data.bride_name,
        groom_name: data.groom_name,
        event_date: data.event_date,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        venue_maps_url: data.venue_maps_url,
        akad_start: data.akad_start,
        akad_end: data.akad_end,
        resepsi_start: data.resepsi_start,
        resepsi_end: data.resepsi_end,
        status: data.status,
      },
    });

    if (result.count === 0) return null;

    const updated = await this.prisma.event.findFirst({
      where: { id: eventId, tenant_id: tenantId },
    });

    return updated
      ? {
          ...updated,
          status: updated.status as EventStatus,
        }
      : null;
  }
}
