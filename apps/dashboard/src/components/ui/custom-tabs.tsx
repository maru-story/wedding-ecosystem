'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CustomTabs({ tabs, activeTab, onChange, className }: CustomTabsProps) {
  return (
    <div
      className={cn(
        'bg-muted/60 border-border/40 flex w-full [scrollbar-width:none] flex-nowrap gap-1 overflow-x-auto rounded-xl border p-1 select-none sm:w-fit [&::-webkit-scrollbar]:hidden',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-center text-sm font-semibold whitespace-nowrap transition-colors duration-200 sm:flex-initial',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="activeTabIndicator"
                className="bg-background border-border/20 absolute inset-0 -z-10 rounded-lg border shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
