'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, Download } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuditLogFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  
  actionFilter: string;
  onActionChange: (value: string) => void;
  
  tenantFilter: string;
  onTenantChange: (value: string) => void;
  tenants: Tenant[];
  
  userFilter: string;
  onUserChange: (value: string) => void;
  users: User[];
  
  startDate: string;
  onStartDateChange: (value: string) => void;
  
  endDate: string;
  onEndDateChange: (value: string) => void;
  
  isExporting: boolean;
  onExportCSV: () => void;
}

export function AuditLogFilters({
  searchQuery,
  onSearchChange,
  actionFilter,
  onActionChange,
  tenantFilter,
  onTenantChange,
  tenants,
  userFilter,
  onUserChange,
  users,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  isExporting,
  onExportCSV,
}: AuditLogFiltersProps) {
  const isFiltered = searchQuery || actionFilter !== 'ALL' || tenantFilter !== 'ALL' || userFilter !== 'ALL' || startDate || endDate;

  return (
    <div className="mb-6 space-y-4">
      {/* Row 1: Search, Action, Tenant, User dropdowns */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search Input */}
        <div className="relative w-full max-w-sm sm:w-[240px]">
          <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
          <Input
            type="text"
            placeholder="Cari Aksi atau Request ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-card border-border/60 focus-visible:ring-ring pl-9 focus-visible:ring-offset-0"
          />
        </div>

        {/* Action Select */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">Aksi:</span>
          <Select value={actionFilter} onValueChange={onActionChange}>
            <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[160px]">
              <SelectValue placeholder="Pilih Aksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Aksi</SelectItem>
              <SelectItem value="login">Masuk Log (Login)</SelectItem>
              <SelectItem value="logout">Keluar Log (Logout)</SelectItem>
              <SelectItem value="data_export">Ekspor Data</SelectItem>
              <SelectItem value="bulk_operation">Operasi Massal</SelectItem>
              <SelectItem value="tenant_config_change">Ubah Konfig Tenant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tenant Select */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">Tenant:</span>
          <Select value={tenantFilter} onValueChange={onTenantChange}>
            <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[180px]">
              <SelectValue placeholder="Pilih Tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Tenant</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User Select */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">User:</span>
          <Select value={userFilter} onValueChange={onUserChange}>
            <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[180px]">
              <SelectValue placeholder="Pilih Pengguna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Pengguna</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Date Inputs & Export/Reset buttons */}
      <div className="flex flex-col gap-4 justify-between border-t border-border/40 pt-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">Mulai:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-card border-border/60 w-[150px] text-sm focus-visible:ring-ring focus-visible:ring-offset-0"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">Sampai:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-card border-border/60 w-[150px] text-sm focus-visible:ring-ring focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                onSearchChange('');
                onActionChange('ALL');
                onTenantChange('ALL');
                onUserChange('ALL');
                onStartDateChange('');
                onEndDateChange('');
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3 text-sm"
            >
              Reset Filter
            </Button>
          )}

          <Button
            onClick={onExportCSV}
            disabled={isExporting}
            variant="outline"
            className="border-border/60 bg-card hover:bg-muted/10 flex h-9 items-center gap-2 rounded-lg text-sm font-semibold"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Mengekspor...' : 'Ekspor CSV'}
          </Button>
        </div>
      </div>
    </div>
  );
}
