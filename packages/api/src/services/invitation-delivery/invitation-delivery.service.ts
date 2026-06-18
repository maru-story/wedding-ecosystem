import { ErrorCode, DeliveryStatus } from '@wedding/shared';
import { PIIEncryption } from '../../middleware/encryption/encryption';

// --- Constants ---

export const DEFAULT_TEMPLATE =
  'Kepada Yth. {nama_tamu},\n\n' +
  'Tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir di acara pernikahan kami.\n\n' +
  'Detail undangan dan RSVP dapat diakses melalui link berikut:\n' +
  '{link_undangan}\n\n' +
  'Merupakan suatu kehormatan bagi kami apabila Anda berkenan hadir. Terima kasih.';

// --- Types ---

export type InvitationChannel = 'whatsapp' | 'email';

export interface SendInvitationResult {
  guest_id: string;
  channel: InvitationChannel;
  success: boolean;
  message?: string;
  whatsapp_url?: string;
  error?: string;
}

export interface DeliveryLogEntry {
  guest_id: string;
  channel: InvitationChannel;
  error: string;
  timestamp: Date;
}

export interface InvitationGuest {
  id: string;
  event_id: string;
  tenant_id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  invitation_url: string | null;
  delivery_status: DeliveryStatus;
}

export interface SendInvitationInput {
  guest_id: string;
  channel: InvitationChannel;
}

export interface ContactCheckResult {
  can_send: boolean;
  available_channels: InvitationChannel[];
  message?: string;
}

export interface InvitationDeliveryError {
  code: ErrorCode;
  message: string;
}

// --- Repository Interface ---

export interface InvitationDeliveryRepository {
  findGuestById(guestId: string, tenantId: string): Promise<InvitationGuest | null>;

  findEventConfigByEventId(
    eventId: string,
    tenantId: string
  ): Promise<{ invitation_message_template: string | null } | null>;

  updateEventConfigTemplate(eventId: string, tenantId: string, template: string): Promise<boolean>;

  updateDeliveryStatus(guestId: string, tenantId: string, status: DeliveryStatus): Promise<boolean>;

  logDeliveryFailure(log: DeliveryLogEntry): Promise<void>;
}

// --- Provider Interfaces (Mock simulation compatibility) ---

export interface WhatsAppProvider {
  send(phone: string, message: string): Promise<{ success: boolean; error?: string }>;
}

export interface EmailProvider {
  send(email: string, subject: string, body: string): Promise<{ success: boolean; error?: string }>;
}

// --- Invitation Delivery Service ---

export class InvitationDeliveryService {
  private readonly repository: InvitationDeliveryRepository;
  private readonly whatsappProvider: WhatsAppProvider;
  private readonly emailProvider: EmailProvider;
  private readonly invitationOrigin: string;
  private readonly piiEncryption: PIIEncryption | null = null;

  constructor(config: {
    repository: InvitationDeliveryRepository;
    whatsappProvider: WhatsAppProvider;
    emailProvider: EmailProvider;
    invitationOrigin: string;
    encryptionKey?: string;
  }) {
    this.repository = config.repository;
    this.whatsappProvider = config.whatsappProvider;
    this.emailProvider = config.emailProvider;
    this.invitationOrigin = config.invitationOrigin;
    if (config.encryptionKey) {
      this.piiEncryption = new PIIEncryption({ encryptionKey: config.encryptionKey });
    }
  }

  // --- Contact Completeness Check ---

  checkContactCompleteness(guest: InvitationGuest): ContactCheckResult {
    const availableChannels: InvitationChannel[] = [];

    if (guest.phone) {
      availableChannels.push('whatsapp');
    }
    if (guest.email) {
      availableChannels.push('email');
    }

    if (availableChannels.length === 0) {
      return {
        can_send: false,
        available_channels: [],
        message: 'Data kontak (phone dan email) harus dilengkapi sebelum undangan dapat dikirim',
      };
    }

    return {
      can_send: true,
      available_channels: availableChannels,
    };
  }

  // --- Get / Update Template ---

  async getMessageTemplate(eventId: string, tenantId: string): Promise<string> {
    const config = await this.repository.findEventConfigByEventId(eventId, tenantId);
    return config?.invitation_message_template || DEFAULT_TEMPLATE;
  }

  async updateMessageTemplate(
    eventId: string,
    tenantId: string,
    template: string
  ): Promise<boolean> {
    return this.repository.updateEventConfigTemplate(eventId, tenantId, template);
  }

  // --- Send Invitation ---

  async sendInvitation(
    input: SendInvitationInput,
    eventId: string,
    tenantId: string
  ): Promise<SendInvitationResult | InvitationDeliveryError> {
    // 1. Find guest
    const guest = await this.repository.findGuestById(input.guest_id, tenantId);
    if (!guest) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Tamu tidak ditemukan',
      };
    }

    if (guest.phone && this.piiEncryption) {
      guest.phone = this.piiEncryption.isEncrypted(guest.phone)
        ? this.piiEncryption.decrypt(guest.phone)
        : guest.phone;
    }

    // Verify guest belongs to the event
    if (guest.event_id !== eventId) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Tamu tidak ditemukan dalam event ini',
      };
    }

    // 2. Check contact completeness for email channel
    if (input.channel === 'email') {
      const contactCheck = this.checkContactCompleteness(guest);
      if (!contactCheck.available_channels.includes('email')) {
        return {
          code: ErrorCode.CONTACT_MISSING,
          message: 'Alamat email tamu belum dilengkapi untuk pengiriman Email',
        };
      }
    }

    if (!guest.invitation_url) {
      return {
        code: ErrorCode.NOTIFICATION_FAILED,
        message: 'Invitation URL belum ter-generate untuk tamu ini',
      };
    }

    // 3. Build personalized invitation link
    const guestUrl = guest.invitation_url.startsWith('/')
      ? `${this.invitationOrigin}${guest.invitation_url}`
      : `${this.invitationOrigin}/${guest.invitation_url}`;

    // 4. Fetch and compile template
    const template = await this.getMessageTemplate(eventId, tenantId);
    const compiledMessage = template
      .replace(/{nama_tamu}/g, guest.name)
      .replace(/{link_undangan}/g, guestUrl);

    // 5. Send/Simulate send
    try {
      let result: { success: boolean; error?: string };

      if (input.channel === 'whatsapp') {
        // Run mock provider for backward compatibility & test compliance
        if (guest.phone) {
          result = await this.whatsappProvider.send(guest.phone, compiledMessage);
        } else {
          // No phone — skip provider call, just generate URL
          result = { success: true };
        }
      } else {
        result = await this.emailProvider.send(
          guest.email!,
          'Undangan Pernikahan',
          compiledMessage
        );
      }

      if (result.success) {
        await this.repository.updateDeliveryStatus(guest.id, tenantId, DeliveryStatus.SENT);

        const finalResult: SendInvitationResult = {
          guest_id: guest.id,
          channel: input.channel,
          success: true,
          message: compiledMessage,
        };

        if (input.channel === 'whatsapp') {
          // Construct the WhatsApp Web redirect URL
          const encodedMessage = encodeURIComponent(compiledMessage);
          if (guest.phone) {
            const sanitizedPhone = guest.phone.replace(/[^0-9]/g, '');
            finalResult.whatsapp_url = `https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedMessage}`;
          } else {
            // No phone — open WhatsApp with message only, user picks contact
            finalResult.whatsapp_url = `https://api.whatsapp.com/send?text=${encodedMessage}`;
          }
        }

        return finalResult;
      } else {
        await this.repository.updateDeliveryStatus(guest.id, tenantId, DeliveryStatus.FAILED);
        await this.repository.logDeliveryFailure({
          guest_id: guest.id,
          channel: input.channel,
          error: result.error || 'Unknown error',
          timestamp: new Date(),
        });

        return {
          guest_id: guest.id,
          channel: input.channel,
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.repository.updateDeliveryStatus(guest.id, tenantId, DeliveryStatus.FAILED);
      await this.repository.logDeliveryFailure({
        guest_id: guest.id,
        channel: input.channel,
        error: errorMessage,
        timestamp: new Date(),
      });

      return {
        guest_id: guest.id,
        channel: input.channel,
        success: false,
        error: errorMessage,
      };
    }
  }

  async getDeliveryStatus(
    guestId: string,
    tenantId: string
  ): Promise<{ delivery_status: DeliveryStatus } | InvitationDeliveryError> {
    const guest = await this.repository.findGuestById(guestId, tenantId);
    if (!guest) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Tamu tidak ditemukan',
      };
    }
    return { delivery_status: guest.delivery_status };
  }
}

// --- Type Guard ---

export function isInvitationDeliveryError(result: any): result is InvitationDeliveryError {
  return (
    result &&
    typeof result === 'object' &&
    'code' in result &&
    'message' in result &&
    !('guest_id' in result) &&
    !('delivery_status' in result)
  );
}
