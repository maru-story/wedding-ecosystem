'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { UserRole } from '@wedding/shared';
import { useAdminUsers, useResetUserPassword } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Building
} from 'lucide-react';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  email: string;
  role: UserRole;
  name: string;
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

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch users via TanStack Query
  const { data, isLoading, error, refetch, isFetching } = useAdminUsers({
    page,
    role: roleFilter,
  });

  const users: UserRecord[] = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
  };

  // Reset Password Dialog
  const [resetUser, setResetUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Mutation
  const resetUserPasswordMutation = useResetUserPassword();

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
    setTimeout(() => setCopied(false), 2000);
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
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.tenant_name && u.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          className="flex items-center gap-2 self-start"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
          Perbarui
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, email, atau tenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Peran:</span>
          <Select 
            value={roleFilter} 
            onValueChange={(val) => {
              setRoleFilter(val as UserRole | 'ALL');
              setPage(1);
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
                <p className="mt-3 text-sm text-muted-foreground">Memuat data pengguna...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center p-6">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-bold text-foreground">Tidak ada pengguna ditemukan</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Coba sesuaikan kata kunci pencarian atau filter peran Anda.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border/40 hover:bg-muted/50">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-border/40 hover:bg-muted/20">
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.name}</span>
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
                    <TableCell className="py-4 px-6 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResetUser(user)}
                        className="flex items-center gap-1.5 ml-auto text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all font-medium h-8"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Reset Password
                      </Button>
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
            Menampilkan <span className="font-medium">{filteredUsers.length}</span> dari{' '}
            <span className="font-medium">{pagination.total}</span> pengguna
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Sebelumnya
            </Button>
            <span className="text-sm text-foreground">
              Halaman {page} dari {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.total_pages}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

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
