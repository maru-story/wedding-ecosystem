'use client';

import { UserRole } from '@wedding/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface UserFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: UserRole | 'ALL';
  onRoleChange: (value: UserRole | 'ALL') => void;
}

export function UserFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleChange,
}: UserFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative w-full max-w-sm sm:w-[240px]">
        <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
        <Input
          type="text"
          placeholder="Cari nama atau email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-card border-border/60 focus-visible:ring-ring pl-9 focus-visible:ring-offset-0"
        />
      </div>

      {/* Role Filter */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Peran:</span>
        <Select
          value={roleFilter}
          onValueChange={(val) => onRoleChange(val as UserRole | 'ALL')}
        >
          <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[160px]">
            <SelectValue placeholder="Semua Peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Peran</SelectItem>
            <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
            <SelectItem value={UserRole.CLIENT}>Client (Pemilik)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset Button */}
      {(searchQuery || roleFilter !== 'ALL') && (
        <Button
          variant="ghost"
          onClick={() => {
            onSearchChange('');
            onRoleChange('ALL');
          }}
          className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3 text-sm"
        >
          Reset Filter
        </Button>
      )}
    </div>
  );
}
