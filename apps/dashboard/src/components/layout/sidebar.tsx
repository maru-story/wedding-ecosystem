'use client';

import React, { createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// --- Context ---
const SidebarContext = createContext<{ isOpen: boolean; onClose: () => void } | undefined>(undefined);

function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('Sidebar components must be used within <Sidebar />');
  return context;
}

// --- Components ---

/**
 * Main Sidebar Container (Compound Component Root)
 */
export function Sidebar({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <SidebarContext.Provider value={{ isOpen, onClose }}>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-border/40 shadow-sm transition-transform duration-300 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b border-border/40 px-6">
          <h2 className="font-heading text-2xl font-semibold tracking-wide text-copper">
            Wedding <span className="font-normal text-primary">Digital</span>
          </h2>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {children}
        </nav>
      </aside>
    </SidebarContext.Provider>
  );
}

/**
 * Sidebar Group for logical separation
 */
Sidebar.Group = function SidebarGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <p className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
          {label}
        </p>
      )}
      <ul className="space-y-1">{children}</ul>
    </div>
  );
};

/**
 * Atomic Sidebar Item with Role Filtering
 */
Sidebar.Item = function SidebarItem({ 
  href, 
  label, 
  icon: Icon, 
  roles 
}: { 
  href: string; 
  label: string; 
  icon: any; 
  roles?: string[] 
}) {
  const pathname = usePathname();
  const { onClose } = useSidebarContext();
  const { user } = useAuth();
  
  // RBAC Filter: Only show if user role matches or no roles specified
  if (roles && !roles.includes(user?.role || '')) return null;

  const isActive = pathname === href;

  return (
    <li>
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-2",
          isActive 
            ? "bg-primary/15 text-foreground border-ring font-semibold" 
            : "text-muted-foreground border-transparent hover:bg-accent/40 hover:text-foreground"
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={cn(
          "h-5 w-5 transition-all duration-200", 
          isActive 
            ? "text-ring scale-110" 
            : "text-muted-foreground/80 group-hover:text-ring group-hover:scale-105"
        )} />
        {label}
      </Link>
    </li>
  );
};
