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
        'flex p-1 bg-muted/60 rounded-xl border border-border/40 w-full sm:w-fit gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap select-none',
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
              'relative flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 cursor-pointer whitespace-nowrap text-center flex items-center justify-center gap-2 z-10',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-background rounded-lg shadow-sm -z-10 border border-border/20"
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
