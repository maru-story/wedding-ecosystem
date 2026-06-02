import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InvitationDeliveryService,
  InvitationDeliveryRepository,
  InvitationGuest,
  WhatsAppProvider,
  EmailProvider,
  SendInvitationResult,
  isInvitationDeliveryError,
  DEFAULT_TEMPLATE,
} from './invitation-delivery.service';
import { DeliveryStatus, ErrorCode } from '@wedding/shared';

// --- Test Helpers ---

const INVITATION_ORIGIN = 'https://wedding.example.com';

function createMockRepository(): InvitationDeliveryRepository {
  return {
    findGuestById: vi.fn(),
    findEventConfigByEventId: vi.fn(),
    updateEventConfigTemplate: vi.fn(),
    updateDeliveryStatus: vi.fn(),
    logDeliveryFailure: vi.fn(),
  };
}

function createMockWhatsAppProvider(): WhatsAppProvider {
  return {
    send: vi.fn(),
  };
}

function createMockEmailProvider(): EmailProvider {
  return {
    send: vi.fn(),
  };
}

function createMockGuest(overrides: Partial<InvitationGuest> = {}): InvitationGuest {
  return {
    id: 'guest-001',
    event_id: 'event-001',
    tenant_id: 'tenant-001',
    name: 'Budi Santoso',
    slug: 'budi-santoso',
    phone: '+6281234567890',
    email: 'budi@example.com',
    invitation_url: '/andi-sari-wedding?to=budi-santoso',
    delivery_status: DeliveryStatus.NOT_SENT,
    ...overrides,
  };
}

// --- Tests ---

describe('InvitationDeliveryService', () => {
  let service: InvitationDeliveryService;
  let repository: InvitationDeliveryRepository;
  let whatsappProvider: WhatsAppProvider;
  let emailProvider: EmailProvider;

  beforeEach(() => {
    repository = createMockRepository();
    whatsappProvider = createMockWhatsAppProvider();
    emailProvider = createMockEmailProvider();
    service = new InvitationDeliveryService({
      repository,
      whatsappProvider,
      emailProvider,
      invitationOrigin: INVITATION_ORIGIN,
    });
  });

  describe('checkContactCompleteness', () => {
    it('should return can_send=true with both channels when guest has phone and email', () => {
      const guest = createMockGuest();
      const result = service.checkContactCompleteness(guest);

      expect(result.can_send).toBe(true);
      expect(result.available_channels).toContain('whatsapp');
      expect(result.available_channels).toContain('email');
    });

    it('should return can_send=true with whatsapp only when guest has phone but no email', () => {
      const guest = createMockGuest({ email: null });
      const result = service.checkContactCompleteness(guest);

      expect(result.can_send).toBe(true);
      expect(result.available_channels).toEqual(['whatsapp']);
    });

    it('should return can_send=true with email only when guest has email but no phone', () => {
      const guest = createMockGuest({ phone: null });
      const result = service.checkContactCompleteness(guest);

      expect(result.can_send).toBe(true);
      expect(result.available_channels).toEqual(['email']);
    });

    it('should return can_send=false when guest has neither phone nor email', () => {
      const guest = createMockGuest({ phone: null, email: null });
      const result = service.checkContactCompleteness(guest);

      expect(result.can_send).toBe(false);
      expect(result.available_channels).toEqual([]);
      expect(result.message).toContain('Data kontak');
    });
  });

  describe('getMessageTemplate & updateMessageTemplate', () => {
    it('should return default template when no custom template is saved', async () => {
      vi.mocked(repository.findEventConfigByEventId).mockResolvedValue(null);
      const template = await service.getMessageTemplate('event-001', 'tenant-001');
      expect(template).toBe(DEFAULT_TEMPLATE);
    });

    it('should return custom template when saved', async () => {
      vi.mocked(repository.findEventConfigByEventId).mockResolvedValue({
        invitation_message_template: 'Halo {nama_tamu}, buka ini: {link_undangan}',
      });
      const template = await service.getMessageTemplate('event-001', 'tenant-001');
      expect(template).toBe('Halo {nama_tamu}, buka ini: {link_undangan}');
    });

    it('should update template', async () => {
      vi.mocked(repository.updateEventConfigTemplate).mockResolvedValue(true);
      const success = await service.updateMessageTemplate('event-001', 'tenant-001', 'Template Baru');
      expect(success).toBe(true);
      expect(repository.updateEventConfigTemplate).toHaveBeenCalledWith('event-001', 'tenant-001', 'Template Baru');
    });
  });

  describe('sendInvitation', () => {
    it('should send invitation via WhatsApp with compiled message and return whatsapp_url', async () => {
      const guest = createMockGuest();
      vi.mocked(repository.findGuestById).mockResolvedValue(guest);
      vi.mocked(repository.findEventConfigByEventId).mockResolvedValue(null); // default template
      vi.mocked(whatsappProvider.send).mockResolvedValue({ success: true });
      vi.mocked(repository.updateDeliveryStatus).mockResolvedValue(true);

      const result = await service.sendInvitation(
        { guest_id: 'guest-001', channel: 'whatsapp' },
        'event-001',
        'tenant-001'
      );

      expect(isInvitationDeliveryError(result)).toBe(false);
      if (!isInvitationDeliveryError(result)) {
        expect(result.success).toBe(true);
        expect(result.channel).toBe('whatsapp');
        expect(result.guest_id).toBe('guest-001');
        expect(result.message).toContain('Budi Santoso');
        expect(result.message).toContain(`${INVITATION_ORIGIN}/andi-sari-wedding?to=budi-santoso`);
        expect(result.whatsapp_url).toContain('https://api.whatsapp.com/send?phone=6281234567890');
        expect(result.whatsapp_url).toContain(encodeURIComponent('Budi Santoso'));
      }

      expect(whatsappProvider.send).toHaveBeenCalledWith(
        '+6281234567890',
        expect.stringContaining(`${INVITATION_ORIGIN}/andi-sari-wedding?to=budi-santoso`)
      );
    });

    it('should update delivery status to SENT on success', async () => {
      const guest = createMockGuest();
      vi.mocked(repository.findGuestById).mockResolvedValue(guest);
      vi.mocked(repository.findEventConfigByEventId).mockResolvedValue(null);
      vi.mocked(whatsappProvider.send).mockResolvedValue({ success: true });
      vi.mocked(repository.updateDeliveryStatus).mockResolvedValue(true);

      await service.sendInvitation(
        { guest_id: 'guest-001', channel: 'whatsapp' },
        'event-001',
        'tenant-001'
      );

      expect(repository.updateDeliveryStatus).toHaveBeenCalledWith(
        'guest-001',
        'tenant-001',
        DeliveryStatus.SENT
      );
    });

    it('should update delivery status to FAILED and log error on failure', async () => {
      const guest = createMockGuest();
      vi.mocked(repository.findGuestById).mockResolvedValue(guest);
      vi.mocked(repository.findEventConfigByEventId).mockResolvedValue(null);
      vi.mocked(whatsappProvider.send).mockResolvedValue({
        success: false,
        error: 'Phone number unreachable',
      });
      vi.mocked(repository.updateDeliveryStatus).mockResolvedValue(true);
      vi.mocked(repository.logDeliveryFailure).mockResolvedValue(undefined);

      const result = await service.sendInvitation(
        { guest_id: 'guest-001', channel: 'whatsapp' },
        'event-001',
        'tenant-001'
      );

      expect(isInvitationDeliveryError(result)).toBe(false);
      if (!isInvitationDeliveryError(result)) {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Phone number unreachable');
      }

      expect(repository.updateDeliveryStatus).toHaveBeenCalledWith(
        'guest-001',
        'tenant-001',
        DeliveryStatus.FAILED
      );

      expect(repository.logDeliveryFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          guest_id: 'guest-001',
          channel: 'whatsapp',
          error: 'Phone number unreachable',
        })
      );
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status for a guest', async () => {
      const guest = createMockGuest({ delivery_status: DeliveryStatus.SENT });
      vi.mocked(repository.findGuestById).mockResolvedValue(guest);

      const result = await service.getDeliveryStatus('guest-001', 'tenant-001');

      expect(isInvitationDeliveryError(result)).toBe(false);
      if (!isInvitationDeliveryError(result)) {
        expect(result.delivery_status).toBe(DeliveryStatus.SENT);
      }
    });
  });
});
