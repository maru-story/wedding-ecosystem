'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { cn } from '@/lib/utils';

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  sectionType: string;
  sortOrder: number;
}

/**
 * Wrapper component for each invitation section.
 * Provides scroll-triggered entrance animations using Motion (Framer Motion).
 */
export function SectionWrapper({
  children,
  className,
  sectionType,
  sortOrder,
}: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.section
      ref={ref}
      className={cn(
        'aspect-[9/16] w-full relative overflow-hidden flex flex-col items-center justify-center p-8 text-center bg-[var(--color-background)]',
        className
      )}
      data-section-type={sectionType}
      data-sort-order={sortOrder}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="w-full h-full flex flex-col items-center justify-center relative z-10">{children}</div>
    </motion.section>
  );
}
