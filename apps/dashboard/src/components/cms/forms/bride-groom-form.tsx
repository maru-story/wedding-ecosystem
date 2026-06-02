'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';

interface EventData {
  id?: string;
  bride_name?: string | null;
  groom_name?: string | null;
}

interface BrideGroomFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

interface PersonData {
  name: string;
  parent_info: string;
  photo: string;
  instagram: string;
}

export function BrideGroomForm({ content, onChange, event }: BrideGroomFormProps) {
  const bride = (content.bride as PersonData) || { name: '', parent_info: '', photo: '', instagram: '' };
  const groom = (content.groom as PersonData) || { name: '', parent_info: '', photo: '', instagram: '' };

  const updatePerson = (role: 'bride' | 'groom', field: keyof PersonData, value: string) => {
    const person = role === 'bride' ? bride : groom;
    onChange({
      ...content,
      [role]: { ...person, [field]: value },
    });
  };

  const handleSyncNames = () => {
    if (!event) return;
    onChange({
      ...content,
      bride: { ...bride, name: event.bride_name || bride.name },
      groom: { ...groom, name: event.groom_name || groom.name },
    });
  };

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'bride-groom');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  const hasEventNames = event?.bride_name || event?.groom_name;

  const renderPersonForm = (role: 'bride' | 'groom', label: string) => {
    const person = role === 'bride' ? bride : groom;

    return (
      <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-800">{label}</h3>

        <div>
          <label htmlFor={`${role}-name`} className="block text-sm font-medium text-gray-700">
            Nama Lengkap
          </label>
          <input
            id={`${role}-name`}
            type="text"
            value={person.name}
            onChange={(e) => updatePerson(role, 'name', e.target.value)}
            placeholder="Nama lengkap"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor={`${role}-parent`} className="block text-sm font-medium text-gray-700">
            Info Orang Tua
          </label>
          <input
            id={`${role}-parent`}
            type="text"
            value={person.parent_info}
            onChange={(e) => updatePerson(role, 'parent_info', e.target.value)}
            placeholder="Contoh: Putra dari Bapak ... & Ibu ..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor={`${role}-instagram`} className="block text-sm font-medium text-gray-700">
            Instagram
          </label>
          <input
            id={`${role}-instagram`}
            type="text"
            value={person.instagram}
            onChange={(e) => updatePerson(role, 'instagram', e.target.value)}
            placeholder="@username"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <MediaUpload
          mediaType="image"
          currentUrl={person.photo}
          onUpload={async (file) => {
            const url = await handleUpload(file);
            updatePerson(role, 'photo', url);
            return url;
          }}
          onRemove={() => updatePerson(role, 'photo', '')}
          label="Foto"
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sync names from event settings */}
      {hasEventNames && (
        <div className="flex items-start justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sinkronkan dari Pengaturan Acara</p>
            <p className="text-xs mt-0.5">
              Isi otomatis nama mempelai dari pengaturan acara:{' '}
              <span className="font-medium text-foreground">
                {event?.groom_name}{event?.groom_name && event?.bride_name ? ' & ' : ''}{event?.bride_name}
              </span>
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handleSyncNames}
            className="ml-3 shrink-0 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Terapkan
          </Button>
        </div>
      )}

      {renderPersonForm('bride', 'Mempelai Wanita')}
      {renderPersonForm('groom', 'Mempelai Pria')}
    </div>
  );
}
