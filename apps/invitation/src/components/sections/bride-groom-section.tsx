'use client';

import Image from 'next/image';
import { SectionWrapper } from './section-wrapper';

interface BrideGroomContent {
  bride?: {
    name?: string;
    parent_info?: string;
    photo?: string;
    instagram?: string;
  };
  groom?: {
    name?: string;
    parent_info?: string;
    photo?: string;
    instagram?: string;
  };
}

interface BrideGroomSectionProps {
  content: BrideGroomContent;
  sortOrder: number;
}

function PersonSection({
  person,
  label,
  sortOrder,
  role,
}: {
  person: BrideGroomContent['bride'] | BrideGroomContent['groom'];
  label: string;
  sortOrder: number;
  role: 'bride' | 'groom';
}) {
  if (!person) return null;

  return (
    <SectionWrapper
      sectionType={`bride_groom_${role}`}
      sortOrder={sortOrder}
      className="border-b border-border/10"
    >
      <div className="flex flex-col items-center justify-center gap-5 w-full h-full my-auto">
        {/* Label */}
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-primary)] font-semibold bg-[var(--color-primary)]/10 px-3 py-1 rounded-full">
          {label}
        </span>

        {/* Profile Photo */}
        {person.photo ? (
          <div className="relative h-44 w-44 overflow-hidden rounded-full border-4 border-[var(--color-accent)] shadow-md transition-transform hover:scale-102 duration-300">
            <Image
              src={person.photo}
              alt={person.name || label}
              fill
              className="object-cover"
              loading="lazy"
              sizes="176px"
            />
          </div>
        ) : (
          <div className="h-44 w-44 rounded-full border-4 border-dashed border-[var(--color-accent)]/40 bg-muted/20 flex items-center justify-center shadow-inner">
            <span className="text-3xl">👤</span>
          </div>
        )}

        {/* Name */}
        <h3 className="font-heading text-3xl font-bold text-[var(--color-primary)] tracking-wide">
          {person.name || (role === 'bride' ? 'Mempelai Wanita' : 'Mempelai Pria')}
        </h3>

        {/* Parent Info */}
        {person.parent_info && (
          <p className="text-sm leading-relaxed text-[var(--color-text)]/80 max-w-[280px] text-pretty">
            {person.parent_info}
          </p>
        )}

        {/* Divider */}
        <div className="h-[2px] w-12 bg-[var(--color-accent)]/30 rounded-full" />

        {/* Instagram Link */}
        {person.instagram && (
          <a
            href={`https://instagram.com/${person.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent)]/80 font-medium underline underline-offset-4 tracking-wider"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
            @{person.instagram.replace('@', '')}
          </a>
        )}
      </div>
    </SectionWrapper>
  );
}

export function BrideGroomSection({ content, sortOrder }: BrideGroomSectionProps) {
  return (
    <>
      {/* 1. Pengantin Intro Card */}
      <SectionWrapper
        sectionType="bride_groom_intro"
        sortOrder={sortOrder}
        className="border-b border-border/10"
      >
        <div className="flex flex-col items-center justify-center gap-6 w-full h-full my-auto">
          {/* Heart icon decorator */}
          <div className="text-4xl text-[var(--color-primary)] animate-pulse">
            💑
          </div>

          <h2 className="font-heading text-4xl font-extrabold text-[var(--color-primary)] tracking-wide text-balance">
            Pasangan Pengantin
          </h2>

          <div className="my-2 h-[2px] w-16 bg-[var(--color-accent)]" />

          <p className="text-sm leading-relaxed text-[var(--color-text)]/75 max-w-[280px] text-pretty">
            Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud mengundang Anda untuk menghadiri pernikahan putra-putri kami:
          </p>

          <div className="flex flex-col items-center gap-2 mt-4">
            <p className="font-heading text-2xl font-bold text-[var(--color-primary)] text-balance">
              {content.bride?.name || 'Mempelai Wanita'}
            </p>
            <span className="font-heading text-xl text-[var(--color-accent)] italic font-semibold">&</span>
            <p className="font-heading text-2xl font-bold text-[var(--color-primary)] text-balance">
              {content.groom?.name || 'Mempelai Pria'}
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* 2. Bride Profile Card */}
      <PersonSection
        person={content.bride}
        label="Mempelai Wanita"
        sortOrder={sortOrder}
        role="bride"
      />

      {/* 3. Groom Profile Card */}
      <PersonSection
        person={content.groom}
        label="Mempelai Pria"
        sortOrder={sortOrder}
        role="groom"
      />
    </>
  );
}
