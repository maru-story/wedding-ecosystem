'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { UserRole } from '@wedding/shared';
import { COPY_FEEDBACK_DURATION_MS, ADMIN_PER_PAGE } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Switch } from '@/components/ui/switch';
import { useTableState } from '@/hooks/use-table-state';
import { useAuth } from '@/contexts/auth-context';
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
  Users, 
  Search, 
  RefreshCw, 
  KeyRound, 
  Calendar,
  Lock,
  Mail,
  Sparkles,
  Clipboard,
  Check,
  Building,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  email: string;
  role: UserRole;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface PaginatedUsers {
  data: UserRecord[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

import { useAdminUsers, useResetUserPassword } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminUsersPage() {
  const tableState = useTableState<UserRecord>({
    initialPerPage: ADMIN_PER_PAGE,
  });
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  // Fetch users via TanStack Query
  const { data, isLoading, error, refetch, isFetching } = useAdminUsers({
    page: tableState.page,
    perPage: tableState.perPage,
    role: roleFilter,
  });

  const users: UserRecord[] = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    per_page: tableState.perPage,
    total: 0,
    total_pages: 0,
  };

  // Reset Password Dialog
  const [resetUser, setResetUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Mutation
  const resetUserPasswordMutation = useResetUserPassword();

  // Auth User context
  const { user: currentUser } = useAuth();

  // Toggle user active status
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await apiFetch<{ success: boolean; data: any }>(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: { is_active: !currentStatus },
      });
      if (response.success) {
        toast.success('Status pengguna berhasil diperbarui');
        refetch();
      }
    } catch (err) {
      toast.error('Gagal memperbarui status pengguna');
    }
  };

  // Add Admin Dialog state & handlers
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      toast.error('Semua field wajib diisi');
      return;
    }
    if (newAdmin.password.length < 8) {
      toast.error('Password minimal harus 8 karakter');
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const response = await apiFetch<{ success: boolean }>(`/admin/users/admin`, {
        method: 'POST',
        body: newAdmin,
      });
      if (response.success) {
        toast.success(`Admin ${newAdmin.name} berhasil dibuat!`);
        setIsAddAdminOpen(false);
        setNewAdmin({ name: '', email: '', password: '' });
        refetch();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const errData = err.data as { error?: { message?: string } };
        toast.error(errData.error?.message || 'Gagal membuat admin baru');
      } else {
        toast.error('Gagal membuat admin baru');
      }
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (newPassword.length < 8) {
      toast.error('Password minimal harus 8 karakter');
      return;
    }

    resetUserPasswordMutation.mutate(
      { userId: resetUser.id, password: newPassword },
      {
        onSuccess: (response) => {
          if (response.success) {
            toast.success(`Password untuk pengguna ${resetUser.name} berhasil diatur ulang!`);
            setResetUser(null);
            setNewPassword('');
          }
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            const errData = err.data as { error?: { message?: string } };
            toast.error(errData.error?.message || 'Gagal menyetel ulang password');
          } else {
            toast.error('Gagal terhubung ke server');
          }
        },
      }
    );
  };

  // Generate strong password
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setCopied(false);
  };

  // Copy password to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    toast.success('Password disalin ke clipboard');
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
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
      errorMessage = errData.error?.message || 'Gagal memuat daftar pengguna';
    } else {
      errorMessage = 'Terjadi kesalahan koneksi ke server';
    }
  }

  // Filter clientside search
  const filteredUsers = users.filter(
    (u: UserRecord) =>
      u.name.toLowerCase().includes(tableState.debouncedSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(tableState.debouncedSearchQuery.toLowerCase()) ||
      (u.tenant_name && u.tenant_name.toLowerCase().includes(tableState.debouncedSearchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Manajemen Pengguna
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola semua akun pengguna di dalam sistem dan atur ulang kredensial akses jika diperlukan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="flex items-center gap-2 self-start"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
            Perbarui
          </Button>
          <Button
            onClick={() => setIsAddAdminOpen(true)}
            className="flex items-center gap-2 self-start"
          >
            <Plus className="h-4 w-4" />
            Admin Baru
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, email, atau tenant..."
            value={tableState.searchQuery}
            onChange={(e) => tableState.setSearchQuery(e.target.value)}
            className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Peran:</span>
          <Select 
            value={roleFilter} 
            onValueChange={(val) => {
              setRoleFilter(val as UserRole | 'ALL');
              tableState.resetPage();
            }}
          >
            <SelectTrigger className="w-[180px] rounded-lg border-border/60">
              <SelectValue placeholder="Semua Peran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Peran</SelectItem>
              <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
              <SelectItem value={UserRole.CLIENT}>Client (Pemilik)</SelectItem>
              <SelectItem value={UserRole.WO}>Wedding Organizer</SelectItem>
              <SelectItem value={UserRole.SCANNER}>Operator Scanner</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in duration-200"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button onClick={() => refetch()} size="sm" variant="destructive">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Users Table using DataTable */}
      <DataTable
        isLoading={isLoading}
        loadingText="Memuat data pengguna..."
        isEmpty={filteredUsers.length === 0}
        emptyTitle="Tidak ada pengguna ditemukan"
        emptyDescription="Coba sesuaikan kata kunci pencarian atau filter peran Anda."
        emptyIcon={<Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />}
        header={
          <>
            <TableHead className="py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Nama Pengguna
            </TableHead>
            <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Peran
            </TableHead>
            <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tenant Asosiasi
            </TableHead>
            <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tanggal Terdaftar
            </TableHead>
            <TableHead className="py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
              Tindakan
            </TableHead>
          </>
        }
        pagination={pagination}
        onPageChange={tableState.setPage}
        onPerPageChange={tableState.setPerPage}
        paginationText={(p) => (
          <>
            Menampilkan <span className="font-medium text-foreground">{(p.page - 1) * p.per_page + 1}</span>–
            <span className="font-medium text-foreground">{Math.min(p.page * p.per_page, p.total)}</span> dari{' '}
            <span className="font-medium text-foreground">{p.total}</span> pengguna
          </>
        )}
      >
        {filteredUsers.map((user) => (
          <TableRow key={user.id} className="border-b border-border/40 hover:bg-muted/20">
            <TableCell className="py-4 px-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${user.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                    {user.name}
                  </span>
                  {!user.is_active && (
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5 shadow-none border hover:bg-destructive font-semibold">
                      Ditangguhkan
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  {user.email}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-4 px-3">
              {user.role === UserRole.ADMIN ? (
                <Badge className="bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50 font-medium hover:opacity-90 shadow-none">
                  Super Admin
                </Badge>
              ) : user.role === UserRole.CLIENT ? (
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 font-medium hover:opacity-90 shadow-none">
                  Client
                </Badge>
              ) : user.role === UserRole.WO ? (
                <Badge className="bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/50 font-medium hover:opacity-90 shadow-none">
                  Wedding Organizer
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 font-medium hover:opacity-90 shadow-none">
                  Scanner Operator
                </Badge>
              )}
            </TableCell>
            <TableCell className="py-4 px-3 text-foreground text-sm">
              {user.tenant_name ? (
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                   <Building className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{user.tenant_name}</span>
                </div>
              ) : (
                <span className="text-xs italic text-muted-foreground font-medium">Layanan Platform (Global)</span>
              )}
            </TableCell>
            <TableCell className="py-4 px-3 text-muted-foreground text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatDate(user.created_at)}</span>
              </div>
            </TableCell>
            <TableCell className="py-4 px-6">
              <div className="flex items-center justify-end gap-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${user.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                    {user.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <Switch
                    checked={user.is_active}
                    onCheckedChange={() => handleToggleUserStatus(user.id, user.is_active)}
                    disabled={user.id === currentUser?.id}
                    aria-label="Toggle status keaktifan user"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResetUser(user)}
                  className="flex items-center gap-1.5 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all font-medium h-8"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Reset Password
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      {/* Add Admin Dialog */}
      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-border/40 bg-card shadow-xl">
          <form onSubmit={handleCreateAdmin}>
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <Plus className="h-6 w-6 text-primary" />
                Tambah Administrator Baru
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Buat akun administrator platform baru. Administrator memiliki akses penuh ke seluruh tenant.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin_name">Nama Lengkap</Label>
                <Input
                  id="admin_name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Masukkan nama lengkap"
                  required
                  className="rounded-lg border-border/60 focus-visible:ring-primary/20 bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin_email">Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@platform.com"
                  required
                  className="rounded-lg border-border/60 focus-visible:ring-primary/20 bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin_password">Password</Label>
                <Input
                  id="admin_password"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimal 8 karakter"
                  required
                  className="rounded-lg border-border/60 focus-visible:ring-primary/20 bg-background"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => setIsAddAdminOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isCreatingAdmin} className="rounded-lg">
                {isCreatingAdmin ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetUser !== null} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-border/40 bg-card shadow-xl">
          {resetUser && (
            <form onSubmit={handleResetPassword}>
              <DialogHeader className="mb-5">
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <KeyRound className="h-5 w-5 text-red-500" />
                  Atur Ulang Password
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1">
                  Ubah atau buat password baru untuk pengguna secara instan.
                </DialogDescription>
              </DialogHeader>

              {/* User info display */}
              <div className="bg-muted/30 border border-border/40 rounded-xl p-4 mb-5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Nama Pengguna:</span>
                  <span className="font-bold text-foreground">{resetUser.name}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-border/40 pt-2">
                  <span className="font-semibold text-muted-foreground">Email Login:</span>
                  <span className="font-bold text-foreground">{resetUser.email}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-border/40 pt-2">
                  <span className="font-semibold text-muted-foreground">Tenant:</span>
                  <span className="font-bold text-foreground">
                    {resetUser.tenant_name || 'Layanan Platform (Global)'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset_password" className="text-xs font-bold text-muted-foreground">
                    Password Baru
                  </Label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset_password"
                        type="text"
                        placeholder="Password minimal 8 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                      />
                    </div>
                    
                    <Button
                      type="button"
                      onClick={generatePassword}
                      variant="outline"
                      title="Buat Password Kuat"
                      className="px-3 border-border rounded-lg shrink-0 flex items-center justify-center hover:bg-muted"
                    >
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    </Button>

                    {newPassword.length >= 8 && (
                      <Button
                        type="button"
                        onClick={copyToClipboard}
                        variant="outline"
                        title="Salin Password"
                        className="px-3 border-border rounded-lg shrink-0 flex items-center justify-center hover:bg-muted"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-success animate-scale-up" />
                        ) : (
                          <Clipboard className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Gunakan tombol bintang untuk menghasilkan password aman secara acak.
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 border-t border-border/40 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetUser(null);
                    setNewPassword('');
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={resetUserPasswordMutation.isPending || newPassword.length < 8}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {resetUserPasswordMutation.isPending ? 'Memperbarui...' : 'Simpan Sandi Baru'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
