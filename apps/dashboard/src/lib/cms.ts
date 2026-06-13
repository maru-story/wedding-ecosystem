// CMS API helpers and types for the dashboard

import { apiFetch } from './api';
import { STORAGE_KEY_ACCESS_TOKEN } from './constants';

// --- Types ---

export interface InvitationSection {
  id: string;
  event_id: string;
  section_type: SectionType;
  sort_order: number;
  is_active: boolean;
  content: Record<string, unknown>;
  updated_at: string;
}

export type SectionType =
  | 'cover'
  | 'bride_groom'
  | 'story'
  | 'verse'
  | 'countdown'
  | 'akad_resepsi'
  | 'rsvp'
  | 'attire'
  | 'gallery'
  | 'video'
  | 'gift'
  | 'messages'
  | 'closing'
  | 'music';

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  cover: 'Cover / Opening',
  bride_groom: 'Pengantin',
  story: 'Our Story',
  verse: 'Doa / Ayat',
  countdown: 'Countdown',
  akad_resepsi: 'Akad & Resepsi',
  rsvp: 'Konfirmasi Kehadiran',
  attire: 'Dress Code',
  gallery: 'Galeri Foto',
  video: 'Video',
  gift: 'Wedding Gift',
  messages: 'Pesan & Ucapan',
  closing: 'Penutup',
  music: 'Background Music',
};

export const SECTION_TYPE_ICONS: Record<SectionType, string> = {
  cover: '🎊',
  bride_groom: '💑',
  story: '📖',
  verse: '🙏',
  countdown: '⏳',
  akad_resepsi: '💒',
  rsvp: '✉️',
  attire: '👗',
  gallery: '📷',
  video: '🎬',
  gift: '🎁',
  messages: '💬',
  closing: '🌸',
  music: '🎵',
};

// --- Media Upload Validation ---

export const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_FORMATS = ['video/mp4'];
export const ALLOWED_AUDIO_FORMATS = ['audio/mpeg', 'audio/mp3'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

export interface MediaValidationError {
  type: 'format' | 'size';
  message: string;
}

export function validateMediaFile(
  file: File,
  mediaType: 'image' | 'video' | 'audio'
): MediaValidationError | null {
  let allowedFormats: string[];
  let maxSize: number;
  let formatNames: string;
  let maxSizeLabel: string;

  switch (mediaType) {
    case 'image':
      allowedFormats = ALLOWED_IMAGE_FORMATS;
      maxSize = MAX_IMAGE_SIZE;
      formatNames = 'JPEG, PNG, atau WebP';
      maxSizeLabel = '5MB';
      break;
    case 'video':
      allowedFormats = ALLOWED_VIDEO_FORMATS;
      maxSize = MAX_VIDEO_SIZE;
      formatNames = 'MP4';
      maxSizeLabel = '50MB';
      break;
    case 'audio':
      allowedFormats = ALLOWED_AUDIO_FORMATS;
      maxSize = MAX_AUDIO_SIZE;
      formatNames = 'MP3';
      maxSizeLabel = '10MB';
      break;
  }

  if (
    !allowedFormats.includes(file.type) &&
    !(mediaType === 'audio' && file.name.endsWith('.mp3'))
  ) {
    return {
      type: 'format',
      message: `Format file tidak didukung. Gunakan format ${formatNames}.`,
    };
  }

  if (file.size > maxSize) {
    return {
      type: 'size',
      message: `Ukuran file melebihi batas maksimal ${maxSizeLabel}. Silakan kompres file Anda.`,
    };
  }

  return null;
}

// --- API Functions ---

export async function fetchSections(eventId: string): Promise<InvitationSection[]> {
  const response = await apiFetch<{ data: InvitationSection[] }>(`/cms/sections/${eventId}`);
  return response.data;
}

export async function updateSectionContent(
  eventId: string,
  sectionId: string,
  content: Record<string, unknown>
): Promise<InvitationSection> {
  return apiFetch<InvitationSection>(`/cms/sections/${eventId}/${sectionId}/content`, {
    method: 'PUT',
    body: { content },
  });
}

export async function toggleSectionActive(
  eventId: string,
  sectionId: string,
  isActive: boolean
): Promise<InvitationSection> {
  return apiFetch<InvitationSection>(`/cms/sections/${eventId}/${sectionId}/toggle`, {
    method: 'PUT',
    body: { is_active: isActive },
  });
}

export async function reorderSection(
  eventId: string,
  sectionId: string,
  newPosition: number
): Promise<InvitationSection> {
  return apiFetch<InvitationSection>(`/cms/sections/${eventId}/${sectionId}/reorder`, {
    method: 'PUT',
    body: { position: newPosition },
  });
}

export async function uploadMedia(
  eventId: string,
  file: File,
  section?: string
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const token =
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN) : null;

  const queryParams = section ? `?section=${encodeURIComponent(section)}` : '';
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/media/upload${queryParams}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload gagal');
  }

  return response.json();
}
