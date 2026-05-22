'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAuth } from '@/contexts/auth-context';
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
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoading, isLoggedIn, router]);

  if (isLoading) {
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Using Declarative Pattern */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <Sidebar.Group>
          <Sidebar.Item href="/" label="Dashboard" icon={Home} />
          <Sidebar.Item href="/guests" label="Daftar Tamu" icon={Users} />
          <Sidebar.Item href="/rsvp" label="Data RSVP" icon={Mail} />
          <Sidebar.Item href="/cms" label="Edit Undangan" icon={FileText} />
          <Sidebar.Item href="/theme" label="Pilih Tema" icon={Palette} />
          {/* Scanner Access given to Client and Admin as per strategy */}
          <Sidebar.Item href="/scanner" label="Scan QR Tamu" icon={QrCode} roles={['client', 'admin']} />
        </Sidebar.Group>

        <Sidebar.Group label="Platform Admin">
          <Sidebar.Item href="/admin/overview" label="Statistik Global" icon={BarChart3} roles={['admin']} />
          <Sidebar.Item href="/admin/tenants" label="Manajemen Tenant" icon={ShieldCheck} roles={['admin']} />
          <Sidebar.Item href="/admin/users" label="Semua User" icon={Users} roles={['admin']} />
        </Sidebar.Group>
      </Sidebar>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
