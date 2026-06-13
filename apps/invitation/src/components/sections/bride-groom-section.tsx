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
      className="border-border/10 border-b"
    >
      <div className="my-auto flex h-full w-full flex-col items-center justify-center gap-5">
        {/* Label */}
        <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[10px] font-semibold tracking-widest text-[var(--color-primary)] uppercase">
          {label}
        </span>

        {/* Profile Photo */}
        {person.photo ? (
          <div className="relative h-44 w-44 overflow-hidden rounded-full border-4 border-[var(--color-accent)] shadow-md transition-transform duration-300 hover:scale-102">
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
          <div className="bg-muted/20 flex h-44 w-44 items-center justify-center rounded-full border-4 border-dashed border-[var(--color-accent)]/40 shadow-inner">
            <span className="text-3xl">👤</span>
          </div>
        )}

        {/* Name */}
        <h3 className="font-heading text-3xl font-bold tracking-wide text-[var(--color-primary)]">
          {person.name || (role === 'bride' ? 'Mempelai Wanita' : 'Mempelai Pria')}
        </h3>

        {/* Parent Info */}
        {person.parent_info && (
          <p className="max-w-[280px] text-sm leading-relaxed text-pretty text-[var(--color-text)]/80">
            {person.parent_info}
          </p>
        )}

        {/* Divider */}
        <div className="h-[2px] w-12 rounded-full bg-[var(--color-accent)]/30" />

        {/* Instagram Link */}
        {person.instagram && (
          <a
            href={`https://instagram.com/${person.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[var(--color-accent)] underline underline-offset-4 hover:text-[var(--color-accent)]/80"
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
        className="border-border/10 border-b"
      >
        <div className="my-auto flex h-full w-full flex-col items-center justify-center gap-6">
          {/* Heart icon decorator */}
          <div className="animate-pulse text-4xl text-[var(--color-primary)]">💑</div>

          <h2 className="font-heading text-4xl font-extrabold tracking-wide text-balance text-[var(--color-primary)]">
            Pasangan Pengantin
          </h2>

          <div className="my-2 h-[2px] w-16 bg-[var(--color-accent)]" />

          <p className="max-w-[280px] text-sm leading-relaxed text-pretty text-[var(--color-text)]/75">
            Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud mengundang Anda untuk
            menghadiri pernikahan putra-putri kami:
          </p>

          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="font-heading text-2xl font-bold text-balance text-[var(--color-primary)]">
              {content.bride?.name || 'Mempelai Wanita'}
            </p>
            <span className="font-heading text-xl font-semibold text-[var(--color-accent)] italic">
              &
            </span>
            <p className="font-heading text-2xl font-bold text-balance text-[var(--color-primary)]">
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
