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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  email: string;
  username: string | null;
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

import { useAdminUsers, useResetUserPassword, useDeleteUser } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserTable } from './components/user-table';
import { UserFilters } from './components/user-filters';

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
  const deleteUserMutation = useDeleteUser();

  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);

  // Auth User context
  const { user: currentUser } = useAuth();

  // Toggle user active status
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await apiFetch<{ success: boolean; data: any }>(
        `/admin/users/${userId}/status`,
        {
          method: 'PATCH',
          body: { is_active: !currentStatus },
        }
      );
      if (response.success) {
        toast.success('Status pengguna berhasil diperbarui');
        refetch();
      }
    } catch (err) {
      toast.error('Gagal memperbarui status pengguna');
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.role === UserRole.ADMIN) {
      toast.error('Pengguna dengan peran Administrator tidak dapat dihapus');
      setUserToDelete(null);
      return;
    }
    deleteUserMutation.mutate(userToDelete.id, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(`Pengguna ${userToDelete.name} berhasil dihapus`);
          setUserToDelete(null);
        }
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          const errData = err.data as { error?: { message?: string } };
          toast.error(errData.error?.message || 'Gagal menghapus pengguna');
        } else {
          toast.error('Gagal terhubung ke server');
        }
      },
    });
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
      (u.tenant_name &&
        u.tenant_name.toLowerCase().includes(tableState.debouncedSearchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-foreground text-3xl font-bold tracking-tight">
            Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kelola semua akun pengguna di dalam sistem dan atur ulang kredensial akses jika
            diperlukan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="flex items-center gap-2 self-start"
          >
            <RefreshCw
              className={`text-muted-foreground h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
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

      {/* User Filters */}
      <UserFilters
        searchQuery={tableState.searchQuery}
        onSearchChange={tableState.setSearchQuery}
        roleFilter={roleFilter}
        onRoleChange={(val) => {
          setRoleFilter(val);
          tableState.resetPage();
        }}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="border-destructive/20 bg-destructive/10 text-destructive animate-in fade-in flex flex-col gap-3 rounded-xl border p-4 text-sm duration-200 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button onClick={() => refetch()} size="sm" variant="destructive">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Users Table */}
      <UserTable
        users={filteredUsers}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={tableState.setPage}
        onPerPageChange={tableState.setPerPage}
        onToggleStatus={handleToggleUserStatus}
        onResetPassword={(user) => setResetUser(user)}
        onDelete={(user) => setUserToDelete(user)}
        currentUser={currentUser}
      />

      {/* Add Admin Dialog */}
      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="border-border/40 bg-card max-w-md rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleCreateAdmin}>
            <DialogHeader className="mb-6">
              <DialogTitle className="text-foreground flex items-center gap-2 text-2xl font-bold">
                <Plus className="text-primary h-6 w-6" />
                Tambah Administrator Baru
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Buat akun administrator platform baru. Administrator memiliki akses penuh ke seluruh
                tenant.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin_name">Nama Lengkap</Label>
                <Input
                  id="admin_name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Masukkan nama lengkap"
                  required
                  className="border-border/60 focus-visible:ring-primary/20 bg-background rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin_email">Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@platform.com"
                  required
                  className="border-border/60 focus-visible:ring-primary/20 bg-background rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin_password">Password</Label>
                <Input
                  id="admin_password"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimal 8 karakter"
                  required
                  className="border-border/60 focus-visible:ring-primary/20 bg-background rounded-lg"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={() => setIsAddAdminOpen(false)}
              >
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
        <DialogContent className="border-border/40 bg-card max-w-md rounded-2xl p-6 shadow-xl">
          {resetUser && (
            <form onSubmit={handleResetPassword}>
              <DialogHeader className="mb-5">
                <DialogTitle className="text-foreground flex items-center gap-2 text-xl font-bold">
                  <KeyRound className="h-5 w-5 text-red-500" />
                  Atur Ulang Password
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1">
                  Ubah atau buat password baru untuk pengguna secara instan.
                </DialogDescription>
              </DialogHeader>

              {/* User info display */}
              <div className="bg-muted/30 border-border/40 mb-5 space-y-2 rounded-xl border p-4">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-semibold">Nama Pengguna:</span>
                  <span className="text-foreground font-bold">{resetUser.name}</span>
                </div>
                <div className="border-border/40 flex justify-between border-t pt-2 text-xs">
                  <span className="text-muted-foreground font-semibold">Email Login:</span>
                  <span className="text-foreground font-bold">{resetUser.email}</span>
                </div>
                <div className="border-border/40 flex justify-between border-t pt-2 text-xs">
                  <span className="text-muted-foreground font-semibold">Tenant:</span>
                  <span className="text-foreground font-bold">
                    {resetUser.tenant_name || 'Layanan Platform (Global)'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="reset_password"
                    className="text-muted-foreground text-xs font-bold"
                  >
                    Password Baru
                  </Label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Lock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Input
                        id="reset_password"
                        type="text"
                        placeholder="Password minimal 8 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 rounded-lg pl-9 transition-colors"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={generatePassword}
                      variant="outline"
                      title="Buat Password Kuat"
                      className="border-border hover:bg-muted flex shrink-0 items-center justify-center rounded-lg px-3"
                    >
                      <Sparkles className="text-primary h-4 w-4 animate-pulse" />
                    </Button>

                    {newPassword.length >= 8 && (
                      <Button
                        type="button"
                        onClick={copyToClipboard}
                        variant="outline"
                        title="Salin Password"
                        className="border-border hover:bg-muted flex shrink-0 items-center justify-center rounded-lg px-3"
                      >
                        {copied ? (
                          <Check className="text-success animate-scale-up h-4 w-4" />
                        ) : (
                          <Clipboard className="text-muted-foreground h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground text-[11px] italic">
                    Gunakan tombol bintang untuk menghasilkan password aman secara acak.
                  </p>
                </div>
              </div>

              <DialogFooter className="border-border/40 mt-6 flex flex-col gap-2 border-t pt-4 sm:flex-row">
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
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 text-white transition-colors hover:bg-red-700"
                >
                  {resetUserPasswordMutation.isPending ? 'Memperbarui...' : 'Simpan Sandi Baru'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="border-border/40 bg-card max-w-md rounded-2xl p-6 shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-destructive animate-in fade-in flex items-center gap-2 text-xl font-bold duration-200">
              <Trash2 className="h-5 w-5" />
              Hapus Pengguna
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus pengguna <strong>{userToDelete?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan dan akan menghapus akses mereka secara permanen
              dari sistem.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="border-border/40 mt-6 flex flex-col gap-2 border-t pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUserToDelete(null)}
              disabled={deleteUserMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="flex items-center justify-center gap-1.5"
            >
              {deleteUserMutation.isPending ? 'Menghapus...' : 'Hapus Permanen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
