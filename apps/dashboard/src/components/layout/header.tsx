'use client';

import { useAuth } from '@/contexts/auth-context';

interface HeaderProps {
  onMenuToggle: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuToggle, showMenuButton = true }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="border-border/40 sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md lg:px-6">
      {/* Mobile menu button */}
      {showMenuButton && (
        <button
          onClick={onMenuToggle}
          className="text-muted-foreground hover:bg-accent rounded-lg p-2 lg:hidden"
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Page title area */}
      <div className={!showMenuButton ? '' : 'hidden lg:block'}>
        <h1 className="text-foreground font-heading text-lg font-medium tracking-wide">
          Dashboard
        </h1>
      </div>

      {/* User info and logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-foreground text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground text-xs capitalize">{user.role}</p>
            </div>
            <div className="bg-copper/10 text-copper flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg px-3 py-1.5 text-sm transition-colors"
          aria-label="Keluar"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
