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

type GuestStatusFilter = 'belum_rsvp' | 'confirmed' | 'declined' | 'checked_in';

interface GuestFiltersProps {
  groupFilter: GuestGroup | '';
  statusFilter: GuestStatusFilter | '';
  onGroupChange: (value: GuestGroup | '') => void;
  onStatusChange: (value: GuestStatusFilter | '') => void;
}

const GROUP_OPTIONS: { value: GuestGroup; label: string }[] = [
  { value: GuestGroup.FAMILY, label: 'Keluarga' },
  { value: GuestGroup.FRIEND, label: 'Teman' },
  { value: GuestGroup.COLLEAGUE, label: 'Rekan Kerja' },
  { value: GuestGroup.VIP, label: 'VIP' },
];

const STATUS_OPTIONS: { value: GuestStatusFilter; label: string }[] = [
  { value: 'belum_rsvp', label: 'Belum RSVP' },
  { value: 'confirmed', label: 'Konfirmasi Hadir' },
  { value: 'declined', label: 'Menolak' },
  { value: 'checked_in', label: 'Sudah Check-in' },
];

export function GuestFilters({
  groupFilter,
  statusFilter,
  onGroupChange,
  onStatusChange,
}: GuestFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Grup:
        </span>
        <Select
          value={groupFilter || 'all'}
          onValueChange={(val) => onGroupChange(val === 'all' ? '' : val as GuestGroup)}
        >
          <SelectTrigger className="w-[160px] bg-card border-border/60 hover:bg-muted/30">
            <SelectValue placeholder="Semua Grup" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Grup</SelectItem>
            {GROUP_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Status:
        </span>
        <Select
          value={statusFilter || 'all'}
          onValueChange={(val) => onStatusChange(val === 'all' ? '' : val as GuestStatusFilter)}
        >
          <SelectTrigger className="w-[160px] bg-card border-border/60 hover:bg-muted/30">
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

      {(groupFilter || statusFilter) && (
        <Button
          variant="ghost"
          onClick={() => {
            onGroupChange('');
            onStatusChange('');
          }}
          className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          Reset Filter
        </Button>
      )}
    </div>
  );
}
