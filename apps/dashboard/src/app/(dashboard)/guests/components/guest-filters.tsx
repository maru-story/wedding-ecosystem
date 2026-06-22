'use client';

import { GuestGroup } from '@wedding/shared';
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
import { useGuestGroups } from '@/hooks/queries';

/** Default preset groups always shown in the filter. */
const DEFAULT_GROUPS: string[] = [];

type GuestStatusFilter = 'belum_rsvp' | 'confirmed' | 'declined' | 'checked_in';

interface GuestFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  groupFilter: string;
  statusFilter: GuestStatusFilter | '';
  onGroupChange: (value: string) => void;
  onStatusChange: (value: GuestStatusFilter | '') => void;
}

const STATUS_OPTIONS: { value: GuestStatusFilter; label: string }[] = [
  { value: 'belum_rsvp', label: 'Belum RSVP' },
  { value: 'confirmed', label: 'Konfirmasi Hadir' },
  { value: 'declined', label: 'Menolak' },
  { value: 'checked_in', label: 'Sudah Check-in' },
];

/** Merge presets + any custom groups returned from the API. */
function mergeGroups(apiGroups: string[] = []): string[] {
  const seen = new Set<string>(DEFAULT_GROUPS);
  const merged = [...DEFAULT_GROUPS];
  for (const g of apiGroups) {
    if (!seen.has(g)) {
      seen.add(g);
      merged.push(g);
    }
  }
  return merged;
}

export function GuestFilters({
  searchQuery,
  onSearchChange,
  groupFilter,
  statusFilter,
  onGroupChange,
  onStatusChange,
}: GuestFiltersProps) {
  const { data: apiGroups } = useGuestGroups();
  const allGroups = mergeGroups(apiGroups);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative w-full max-w-sm sm:w-[240px]">
        <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
        <Input
          type="text"
          placeholder="Cari nama tamu..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-card border-border/60 focus-visible:ring-ring pl-9 focus-visible:ring-offset-0"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Grup:</span>
        <Select
          value={groupFilter || 'all'}
          onValueChange={(val) => onGroupChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[160px]">
            <SelectValue placeholder="Semua Grup" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Grup</SelectItem>
            {allGroups.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Status:</span>
        <Select
          value={statusFilter || 'all'}
          onValueChange={(val) => onStatusChange(val === 'all' ? '' : (val as GuestStatusFilter))}
        >
          <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[160px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(searchQuery || groupFilter || statusFilter) && (
        <Button
          variant="ghost"
          onClick={() => {
            onSearchChange('');
            onGroupChange('');
            onStatusChange('');
          }}
          className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3 text-sm"
        >
          Reset Filter
        </Button>
      )}
    </div>
  );
}
