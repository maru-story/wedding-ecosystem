'use client';

import { PlanType } from '@wedding/shared';
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

interface TenantFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  planFilter: PlanType | 'ALL';
  onPlanChange: (value: PlanType | 'ALL') => void;
}

export function TenantFilters({
  searchQuery,
  onSearchChange,
  planFilter,
  onPlanChange,
}: TenantFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative w-full max-w-sm sm:w-[240px]">
        <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
        <Input
          type="text"
          placeholder="Cari nama atau slug..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-card border-border/60 focus-visible:ring-ring pl-9 focus-visible:ring-offset-0"
        />
      </div>

      {/* Plan Filter */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Paket:</span>
        <Select
          value={planFilter}
          onValueChange={(val) => onPlanChange(val as PlanType | 'ALL')}
        >
          <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[160px]">
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

      {/* Reset Button */}
      {(searchQuery || planFilter !== 'ALL') && (
        <Button
          variant="ghost"
          onClick={() => {
            onSearchChange('');
            onPlanChange('ALL');
          }}
          className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3 text-sm"
        >
          Reset Filter
        </Button>
      )}
    </div>
  );
}
