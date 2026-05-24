'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { PlanType } from '@wedding/shared';
import { useAdminTenants, useCreateTenant, useToggleTenantStatus } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  Search, 
  Plus, 
  RefreshCw, 
  Calendar,
  Lock,
  Mail,
  User,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_type: PlanType;
  is_active: boolean;
  created_at: string;
}

interface PaginatedTenants {
  data: Tenant[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export default function AdminTenantsPage() {
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState<PlanType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch tenants via TanStack Query
  const { data, isLoading, error, refetch, isFetching } = useAdminTenants({
    page,
    planType: planFilter,
  });

  const tenants: Tenant[] = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
  };

  // Mutations
  const toggleTenantStatusMutation = useToggleTenantStatus();
  const createTenantMutation = useCreateTenant();

  // Dialog / Modal Add Tenant
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    plan_type: PlanType.BASIC,
    client_name: '',
    client_email: '',
    client_password: '',
  });

  // Handle status toggle
  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    toggleTenantStatusMutation.mutate(
      { tenantId, isActive: !currentStatus },
      {
        onSuccess: (response) => {
          if (response.success) {
            toast.success(`Status keaktifan tenant berhasil diperbarui`);
          }
        },
        onError: () => {
          toast.error('Gagal memperbarui status tenant');
        },
      }
    );
  };

  // Auto-slugify tenant name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    setNewTenant((prev) => ({ ...prev, name, slug }));
  };

  // Generate random strong password
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewTenant((prev) => ({ ...prev, client_password: pass }));
  };

  // Handle create tenant
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    createTenantMutation.mutate(newTenant, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(`Tenant ${response.data.name} berhasil dibuat!`);
          setIsAddOpen(false);
          setNewTenant({
            name: '',
            slug: '',
            plan_type: PlanType.BASIC,
            client_name: '',
            client_email: '',
            client_password: '',
          });
        }
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          const errData = err.data as { error?: { message?: string } };
          toast.error(errData.error?.message || 'Gagal membuat tenant');
        } else {
          toast.error('Gagal terhubung ke server');
        }
      },
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Format error message
  let errorMessage = '';
  if (error) {
    if (error instanceof ApiError) {
      const errData = error.data as { error?: { message?: string } };
      errorMessage = errData.error?.message || 'Gagal memuat daftar tenant';
    } else {
      errorMessage = 'Terjadi kesalahan koneksi ke server';
    }
  }

  // Filter clientside search
  const filteredTenants = tenants.filter(
    (t: Tenant) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Manajemen Tenant
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar dan kelola semua penyewa/tenant pada platform digital secara terpusat.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
            Perbarui
          </Button>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Tenant
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau slug tenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Paket:</span>
          <Select 
            value={planFilter} 
            onValueChange={(val) => setPlanFilter(val as PlanType | 'ALL')}
          >
            <SelectTrigger className="w-[180px] rounded-lg border-border/60">
              <SelectValue placeholder="Semua Paket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Paket</SelectItem>
              <SelectItem value={PlanType.BASIC}>Basic</SelectItem>
              <SelectItem value={PlanType.PREMIUM}>Premium</SelectItem>
              <SelectItem value={PlanType.ENTERPRISE}>Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button onClick={() => refetch()} size="sm" variant="destructive">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Table Card */}
      <Card className="border-border/40 shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-3 text-sm text-muted-foreground">Memuat data tenant...</p>
              </div>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center p-6">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-bold text-foreground">Tidak ada tenant ditemukan</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Coba sesuaikan kata kunci pencarian atau filter tipe paket Anda.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border/40 hover:bg-muted/50">
                  <TableHead className="py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Nama Tenant
                  </TableHead>
                  <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Slug
                  </TableHead>
                  <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Tipe Paket
                  </TableHead>
                  <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Tanggal Dibuat
                  </TableHead>
                  <TableHead className="py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Status Aktif
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="border-b border-border/40 hover:bg-muted/20">
                    <TableCell className="py-4 px-6 font-medium text-foreground">
                      {tenant.name}
                    </TableCell>
                    <TableCell className="py-4 px-3 text-muted-foreground text-sm">
                      /{tenant.slug}
                    </TableCell>
                    <TableCell className="py-4 px-3">
                      {tenant.plan_type === PlanType.ENTERPRISE ? (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50 font-medium hover:opacity-90 shadow-none">
                          Enterprise
                        </Badge>
                      ) : tenant.plan_type === PlanType.PREMIUM ? (
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 font-medium hover:opacity-90 shadow-none">
                          Premium
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-border/50 font-medium hover:bg-muted shadow-none">
                          Basic
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-3 text-muted-foreground text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{formatDate(tenant.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className={`text-xs font-semibold ${tenant.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                          {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <Switch
                          checked={tenant.is_active}
                          onCheckedChange={() => handleToggleStatus(tenant.id, tenant.is_active)}
                          aria-label="Toggle status keaktifan tenant"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <p className="text-sm text-muted-foreground">
            Menampilkan <span className="font-medium">{filteredTenants.length}</span> dari{' '}
            <span className="font-medium">{pagination.total}</span> tenant
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Sebelumnya
            </Button>
            <span className="text-sm text-foreground">
              Halaman {pagination.page} dari {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page === pagination.total_pages}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Add Tenant Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 border-border/40 bg-card shadow-xl">
          <form onSubmit={handleCreateTenant}>
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                Tambah Tenant Baru
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Isi detail tenant baru dan buat akun pengelola utamanya secara otomatis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Tenant Section */}
              <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Detail Tenant
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="tenant_name" className="text-xs font-bold text-muted-foreground">
                      Nama Tenant
                    </Label>
                    <Input
                      id="tenant_name"
                      placeholder="Nama mempelai / acara"
                      value={newTenant.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="tenant_slug" className="text-xs font-bold text-muted-foreground">
                      Slug URL
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-muted-foreground/60 font-medium">/</span>
                      <Input
                        id="tenant_slug"
                        placeholder="slug-url"
                        value={newTenant.slug}
                        onChange={(e) => setNewTenant((prev) => ({ ...prev, slug: e.target.value }))}
                        required
                        className="pl-6 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plan_type" className="text-xs font-bold text-muted-foreground">
                    Tipe Paket
                  </Label>
                  <Select
                    value={newTenant.plan_type}
                    onValueChange={(val) => setNewTenant((prev) => ({ ...prev, plan_type: val as PlanType }))}
                  >
                    <SelectTrigger id="plan_type" className="rounded-lg border-border/60">
                      <SelectValue placeholder="Pilih paket" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PlanType.BASIC}>Basic (Maks 100 Tamu)</SelectItem>
                      <SelectItem value={PlanType.PREMIUM}>Premium (Maks 500 Tamu)</SelectItem>
                      <SelectItem value={PlanType.ENTERPRISE}>Enterprise (Kustom)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin Client User Section */}
              <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <User className="h-4 w-4 text-emerald-500" />
                  Detail Akun Client (Pengelola)
                </h3>

                <div className="space-y-1.5">
                  <Label htmlFor="client_name" className="text-xs font-bold text-muted-foreground">
                    Nama Lengkap Client
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="client_name"
                      placeholder="Nama lengkap pengelola"
                      value={newTenant.client_name}
                      onChange={(e) => setNewTenant((prev) => ({ ...prev, client_name: e.target.value }))}
                      required
                      className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="client_email" className="text-xs font-bold text-muted-foreground">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="client_email"
                        type="email"
                        placeholder="client@mail.com"
                        value={newTenant.client_email}
                        onChange={(e) => setNewTenant((prev) => ({ ...prev, client_email: e.target.value }))}
                        required
                        className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="client_password" className="text-xs font-bold text-muted-foreground">
                      Password Akun
                    </Label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="client_password"
                          type="text"
                          placeholder="Password minimal 8 karakter"
                          value={newTenant.client_password}
                          onChange={(e) => setNewTenant((prev) => ({ ...prev, client_password: e.target.value }))}
                          required
                          className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={generatePassword}
                        variant="outline"
                        title="Generate Password Acak"
                        className="px-3 border-border rounded-lg shrink-0 flex items-center justify-center hover:bg-muted"
                      >
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createTenantMutation.isPending}
                className="flex items-center justify-center gap-1.5"
              >
                {createTenantMutation.isPending ? 'Menyimpan...' : 'Simpan Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
