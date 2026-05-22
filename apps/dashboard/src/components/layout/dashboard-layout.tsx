'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAuth } from '@/contexts/auth-context';
import { useEvent } from '@/hooks/queries';
import { 
  Home, 
  Users, 
  Mail, 
  FileText, 
  Palette, 
  BarChart3, 
  ShieldCheck, 
  QrCode 
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { data: event, isLoading: eventLoading } = useEvent();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Auth Guard: Redirect to login if not logged in
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
      return;
    }

    // 2. Onboarding Guard: Redirect to onboarding if no event exists
    // Skip if already on onboarding page
    if (!authLoading && isLoggedIn && !eventLoading && !event && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
    
    // 3. Reverse Guard: If event exists, don't allow access to onboarding
    if (event && pathname === '/onboarding') {
      router.push('/');
    }
  }, [authLoading, isLoggedIn, eventLoading, event, pathname, router]);

  // Loading state for initial session check
  if (authLoading || (isLoggedIn && eventLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  // If on onboarding page, show a simplified layout (no sidebar)
  if (pathname === '/onboarding') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onMenuToggle={() => {}} showMenuButton={false} />
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <Sidebar.Group>
          <Sidebar.Item href="/" label="Dashboard" icon={Home} />
          <Sidebar.Item href="/guests" label="Daftar Tamu" icon={Users} />
          <Sidebar.Item href="/rsvp" label="Data RSVP" icon={Mail} />
          <Sidebar.Item href="/cms" label="Edit Undangan" icon={FileText} />
          <Sidebar.Item href="/theme" label="Pilih Tema" icon={Palette} />
          <Sidebar.Item href="/scanner" label="Scan QR Tamu" icon={QrCode} roles={['client', 'admin']} />
        </Sidebar.Group>

        <Sidebar.Group label="Platform Admin">
          <Sidebar.Item href="/admin/overview" label="Statistik Global" icon={BarChart3} roles={['admin']} />
          <Sidebar.Item href="/admin/tenants" label="Manajemen Tenant" icon={ShieldCheck} roles={['admin']} />
          <Sidebar.Item href="/admin/users" label="Semua User" icon={Users} roles={['admin']} />
        </Sidebar.Group>
      </Sidebar>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
