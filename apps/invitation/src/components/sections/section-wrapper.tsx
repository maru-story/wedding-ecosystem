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
        'relative flex aspect-[9/16] w-full flex-col items-center justify-center overflow-hidden bg-[var(--color-background)] p-8 text-center',
        className
      )}
      data-section-type={sectionType}
      data-sort-order={sortOrder}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
        {children}
      </div>
    </motion.section>
  );
}
