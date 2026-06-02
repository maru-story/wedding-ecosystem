'use client';

import { SectionWrapper } from './section-wrapper';
import { RsvpForm } from '../rsvp-form';

interface RsvpContent {
  options?: string[];
  max_plus_one?: number;
}

interface RsvpSectionProps {
  content: RsvpContent;
  sortOrder: number;
  guestId?: string;
  eventId?: string;
  plusOneCount?: number;
}

export function RsvpSection({ content, sortOrder, guestId, eventId, plusOneCount }: RsvpSectionProps) {
  return (
    <SectionWrapper sectionType="rsvp" sortOrder={sortOrder} className="flex flex-col justify-center py-8">
      {/* Title */}
      <h2 className="mb-4 text-center font-heading text-2xl font-bold text-[var(--color-primary)]">
        Konfirmasi Kehadiran
      </h2>

      {/* RSVP Form container */}
      <div className="w-full max-w-[320px] text-left my-auto bg-white/40 p-5 rounded-2xl border border-[var(--color-accent)]/15 shadow-xs">
        {guestId && eventId ? (
          <RsvpForm guestId={guestId} eventId={eventId} plusOneCount={plusOneCount ?? content.max_plus_one ?? 0} />
        ) : (
          <div className="text-center text-xs text-muted-foreground py-4">
            Formulir konfirmasi hanya tersedia melalui tautan undangan personal.
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
