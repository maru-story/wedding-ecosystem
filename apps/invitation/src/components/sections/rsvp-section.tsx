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

export function RsvpSection({
  content,
  sortOrder,
  guestId,
  eventId,
  plusOneCount,
}: RsvpSectionProps) {
  return (
    <SectionWrapper
      sectionType="rsvp"
      sortOrder={sortOrder}
      className="flex flex-col justify-center py-8"
    >
      {/* Title */}
      <h2 className="font-heading mb-4 text-center text-2xl font-bold text-[var(--color-primary)]">
        Konfirmasi Kehadiran
      </h2>

      {/* RSVP Form container */}
      <div className="my-auto w-full max-w-[320px] rounded-2xl border border-[var(--color-accent)]/15 bg-white/40 p-5 text-left shadow-xs">
        {guestId && eventId ? (
          <RsvpForm
            guestId={guestId}
            eventId={eventId}
            plusOneCount={plusOneCount ?? content.max_plus_one ?? 0}
          />
        ) : (
          <div className="text-muted-foreground py-4 text-center text-xs">
            Formulir konfirmasi hanya tersedia melalui tautan undangan personal.
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
