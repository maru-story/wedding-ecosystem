'use client';

import { UserRole } from '@wedding/shared';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Mail, Calendar, KeyRound, Trash2, Users, Building } from 'lucide-react';

export interface UserRecord {
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

interface UserTableProps {
  users: UserRecord[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onResetPassword: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
  currentUser: { id: string } | null;
}

export function UserTable({
  users,
  pagination,
  isLoading,
  onPageChange,
  onPerPageChange,
  onToggleStatus,
  onResetPassword,
  onDelete,
  currentUser,
}: UserTableProps) {
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

  return (
    <DataTable
      isLoading={isLoading}
      loadingText="Memuat data pengguna..."
      isEmpty={users.length === 0}
      emptyTitle="Tidak ada pengguna ditemukan"
      emptyDescription="Coba sesuaikan kata kunci pencarian atau filter peran Anda."
      emptyIcon={<Users className="text-muted-foreground/30 mx-auto mb-3 h-12 w-12" />}
      header={
        <>
          <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold tracking-wider uppercase">
            Nama Pengguna
          </TableHead>
          <TableHead className="text-muted-foreground px-3 py-4 text-xs font-bold tracking-wider uppercase">
            Peran
          </TableHead>
          <TableHead className="text-muted-foreground px-3 py-4 text-xs font-bold tracking-wider uppercase">
            Tenant Asosiasi
          </TableHead>
          <TableHead className="text-muted-foreground px-3 py-4 text-xs font-bold tracking-wider uppercase">
            Tanggal Terdaftar
          </TableHead>
          <TableHead className="text-muted-foreground px-6 py-4 text-right text-xs font-bold tracking-wider uppercase">
            Tindakan
          </TableHead>
        </>
      }
      pagination={pagination}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      paginationText={(p) => (
        <>
          Menampilkan{' '}
          <span className="text-foreground font-medium">{(p.page - 1) * p.per_page + 1}</span>–
          <span className="text-foreground font-medium">
            {Math.min(p.page * p.per_page, p.total)}
          </span>{' '}
          dari <span className="text-foreground font-medium">{p.total}</span> pengguna
        </>
      )}
    >
      {users.map((user) => (
        <TableRow key={user.id} className="border-border/40 hover:bg-muted/20 border-b">
          <TableCell className="px-6 py-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium ${user.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}
                >
                  {user.name}
                </span>
                {!user.is_active && (
                  <Badge
                    variant="destructive"
                    className="hover:bg-destructive border px-1.5 py-0 text-[10px] font-semibold shadow-none"
                  >
                    Ditangguhkan
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  {user.email}
                </span>
                {user.username && (
                  <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
                    @{user.username}
                  </span>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="px-3 py-4">
            {user.role === UserRole.ADMIN ? (
              <Badge className="border-red-100 bg-red-50 font-medium text-red-700 shadow-none hover:opacity-90 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                Super Admin
              </Badge>
            ) : user.role === UserRole.CLIENT ? (
              <Badge className="border-indigo-100 bg-indigo-50 font-medium text-indigo-700 shadow-none hover:opacity-90 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400">
                Client
              </Badge>
            ) : user.role === UserRole.WO ? (
              <Badge className="border-teal-100 bg-teal-50 font-medium text-teal-700 shadow-none hover:opacity-90 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-400">
                Wedding Organizer
              </Badge>
            ) : (
              <Badge className="border-amber-100 bg-amber-50 font-medium text-amber-700 shadow-none hover:opacity-90 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
                Scanner Operator
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-foreground px-3 py-4 text-sm">
            {user.tenant_name ? (
              <div className="text-foreground flex items-center gap-1.5 font-medium">
                <Building className="text-muted-foreground h-3.5 w-3.5" />
                <span>{user.tenant_name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs font-medium italic">
                Layanan Platform (Global)
              </span>
            )}
          </TableCell>
          <TableCell className="text-muted-foreground px-3 py-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="text-muted-foreground h-3.5 w-3.5" />
              <span>{formatDate(user.created_at)}</span>
            </div>
          </TableCell>
          <TableCell className="px-6 py-4">
            <div className="flex items-center justify-end gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold ${user.is_active ? 'text-success' : 'text-muted-foreground'}`}
                >
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <Switch
                  checked={user.is_active}
                  onCheckedChange={() => onToggleStatus(user.id, user.is_active)}
                  disabled={user.id === currentUser?.id}
                  aria-label="Toggle status keaktifan user"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onResetPassword(user)}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 flex h-8 items-center gap-1.5 text-xs font-medium transition-all"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Reset Password
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={user.id === currentUser?.id || user.role === UserRole.ADMIN}
                onClick={() => onDelete(user)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 disabled:opacity-40"
                title={
                  user.id === currentUser?.id
                    ? 'Anda tidak dapat menghapus akun sendiri'
                    : user.role === UserRole.ADMIN
                    ? 'Pengguna dengan peran Administrator tidak dapat dihapus'
                    : 'Hapus Pengguna'
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}
