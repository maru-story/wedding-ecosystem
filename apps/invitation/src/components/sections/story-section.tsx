'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SectionWrapper } from './section-wrapper';
import { motion, AnimatePresence } from 'motion/react';

interface StoryChapter {
  title?: string;
  description?: string;
  image?: string;
  date?: string;
}

interface StoryContent {
  chapters?: StoryChapter[];
}

interface StorySectionProps {
  content: StoryContent;
  sortOrder: number;
}

export function StorySection({ content, sortOrder }: StorySectionProps) {
  const chapters = content.chapters && content.chapters.length > 0
    ? content.chapters
    : [
        {
          title: 'Pertama Bertemu',
          date: '10 Januari 2024',
          description: 'Awal mula kisah indah kami dimulai dari pertemuan yang tidak disengaja.',
          image: '',
        },
        {
          title: 'Menjalin Hubungan',
          date: '15 Maret 2024',
          description: 'Kami memutuskan untuk melangkah bersama dan berkomitmen satu sama lain.',
          image: '',
        },
        {
          title: 'Lamaran',
          date: '20 Desember 2025',
          description: 'Di hadapan keluarga besar, kami mengikat janji untuk melangkah ke pelaminan.',
          image: '',
        }
      ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextChapter = () => {
    setCurrentIndex((prev) => (prev + 1) % chapters.length);
  };

  const prevChapter = () => {
    setCurrentIndex((prev) => (prev - 1 + chapters.length) % chapters.length);
  };

  const currentChapter = chapters[currentIndex];

  return (
    <SectionWrapper sectionType="story" sortOrder={sortOrder} className="relative select-none">
      {/* Background decoration or title */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full text-center">
        <h2 className="font-heading text-3xl font-bold text-[var(--color-primary)] tracking-wide">
          Cerita Kami
        </h2>
        <div className="mx-auto mt-2 h-[2px] w-12 bg-[var(--color-accent)]" />
      </div>

      {/* Main Chapter Content Container */}
      <div className="relative w-full max-w-[310px] h-[360px] flex flex-col justify-between mt-12 bg-white/40 backdrop-blur-xs rounded-2xl border border-[var(--color-accent)]/20 p-5 shadow-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full justify-between"
          >
            {/* Header & Date */}
            <div className="text-center">
              {currentChapter.date && (
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                  {currentChapter.date}
                </span>
              )}
              {currentChapter.title && (
                <h3 className="font-heading text-lg font-bold text-[var(--color-primary)] mt-1 line-clamp-1">
                  {currentChapter.title}
                </h3>
              )}
            </div>

            {/* Illustration/Image */}
            <div className="relative my-3 w-full h-[150px] overflow-hidden rounded-xl bg-muted/20 border border-gray-100 flex items-center justify-center shadow-inner">
              {currentChapter.image ? (
                <Image
                  src={currentChapter.image}
                  alt={currentChapter.title || 'Cerita'}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                  sizes="310px"
                />
              ) : (
                <div className="text-center p-4">
                  <span className="text-4xl block mb-1">📖</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Kisah Kami</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="text-center flex-1 flex items-center justify-center">
              <p className="text-xs leading-relaxed text-[var(--color-text)]/85 line-clamp-4 px-2">
                {currentChapter.description || 'Tidak ada deskripsi cerita.'}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons and Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full">
        {/* Navigation buttons */}
        <div className="flex items-center gap-6">
          <button
            onClick={prevChapter}
            className="h-8 w-8 rounded-full border border-[var(--color-accent)]/30 bg-white/70 hover:bg-white flex items-center justify-center text-[var(--color-primary)] active:scale-90 transition-transform cursor-pointer"
            aria-label="Cerita sebelumnya"
          >
            ←
          </button>
          
          {/* Slide dots */}
          <div className="flex gap-2">
            {chapters.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === index
                    ? 'bg-[var(--color-primary)] scale-110'
                    : 'bg-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/60'
                }`}
                aria-label={`Ke slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextChapter}
            className="h-8 w-8 rounded-full border border-[var(--color-accent)]/30 bg-white/70 hover:bg-white flex items-center justify-center text-[var(--color-primary)] active:scale-90 transition-transform cursor-pointer"
            aria-label="Cerita selanjutnya"
          >
            →
          </button>
        </div>
      </div>
    </SectionWrapper>
  );
}

