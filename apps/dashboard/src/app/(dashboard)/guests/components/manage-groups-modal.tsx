'use client';

import { useState } from 'react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GuestGroup } from '@wedding/shared';
import { useGuestGroups, useGuests, useReassignGroup } from '@/hooks/queries';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Trash2 } from 'lucide-react';

/** Default preset groups */
const DEFAULT_GROUPS: string[] = [];

interface ManageGroupsModalProps {
  open: boolean;
  onClose: () => void;
}

interface GroupWithCount {
  name: string;
  count: number;
}

export function ManageGroupsModal({ open, onClose }: ManageGroupsModalProps) {
  const { data: apiGroups } = useGuestGroups();
  const { data: guestsData } = useGuests({ perPage: 100 });
  const reassignGroup = useReassignGroup();

  const [reassigning, setReassigning] = useState<string | null>(null);
  const [targetGroup, setTargetGroup] = useState<string>('');
  const [customTarget, setCustomTarget] = useState('');

  // Build group counts from guest data
  const groupCounts: GroupWithCount[] = (() => {
    const countMap = new Map<string, number>();

    // Initialize with API groups
    if (apiGroups) {
      for (const g of apiGroups) {
        countMap.set(g, 0);
      }
    }

    // Count guests per group from loaded data
    // Note: this is approximate since we may not have all pages loaded
    if (guestsData?.data) {
      for (const guest of guestsData.data) {
        countMap.set(guest.group, (countMap.get(guest.group) ?? 0) + 1);
      }
    }

    // If we have API groups but no guest data counts, still show them
    if (apiGroups && (!guestsData?.data || guestsData.data.length === 0)) {
      return apiGroups.map((g) => ({ name: g, count: 0 }));
    }

    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  // All available target groups (presets + existing, excluding the one being reassigned)
  const getTargetOptions = (excludeGroup: string): string[] => {
    const seen = new Set<string>();
    const options: string[] = [];

    for (const g of DEFAULT_GROUPS) {
      if (g !== excludeGroup) {
        seen.add(g);
        options.push(g);
      }
    }

    if (apiGroups) {
      for (const g of apiGroups) {
        if (g !== excludeGroup && !seen.has(g)) {
          seen.add(g);
          options.push(g);
        }
      }
    }

    return options;
  };

  const handleStartReassign = (groupName: string) => {
    setReassigning(groupName);
    setTargetGroup('');
    setCustomTarget('');
  };

  const handleCancel = () => {
    setReassigning(null);
    setTargetGroup('');
    setCustomTarget('');
  };

  const handleConfirmReassign = async () => {
    if (!reassigning) return;

    const finalTarget = targetGroup === '__custom__' ? customTarget.trim() : targetGroup;

    if (!finalTarget) {
      toast.error('Pilih grup tujuan');
      return;
    }

    if (finalTarget === reassigning) {
      toast.error('Grup tujuan tidak boleh sama dengan grup asal');
      return;
    }

    try {
      const result = await reassignGroup.mutateAsync({
        from: reassigning,
        to: finalTarget,
      });
      toast.success(result.message);
      handleCancel();
    } catch {
      toast.error('Gagal memindahkan grup. Silakan coba lagi.');
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Kelola Grup"
      description="Pindahkan semua tamu dari satu grup ke grup lain. Grup yang kosong akan otomatis hilang."
      className="sm:max-w-md"
    >
      <div className="space-y-2">
        {groupCounts.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Belum ada grup. Tambahkan tamu untuk membuat grup.
          </p>
        )}

        {groupCounts.map((group) => (
          <div
            key={group.name}
            className="border-border/40 bg-muted/20 flex items-center justify-between rounded-lg border px-4 py-3"
          >
            {reassigning === group.name ? (
              // Reassign mode for this group
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Pindahkan</span>
                  <span className="text-foreground font-medium">{group.name}</span>
                  <ArrowRight className="text-muted-foreground h-3.5 w-3.5" />
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={targetGroup}
                    onValueChange={(val) => {
                      setTargetGroup(val);
                      if (val !== '__custom__') setCustomTarget('');
                    }}
                  >
                    <SelectTrigger className="bg-card border-border/60 h-9 flex-1">
                      <SelectValue placeholder="Pilih grup tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTargetOptions(group.name).map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Buat grup baru...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {targetGroup === '__custom__' && (
                  <Input
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value)}
                    placeholder="Nama grup baru"
                    className="bg-card border-border/60 h-9"
                    maxLength={100}
                  />
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmReassign}
                    disabled={
                      reassignGroup.isPending ||
                      (!targetGroup || (targetGroup === '__custom__' && !customTarget.trim()))
                    }
                  >
                    {reassignGroup.isPending && (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    )}
                    Pindahkan
                  </Button>
                </div>
              </div>
            ) : (
              // Normal display
              <>
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-medium">{group.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({group.count} tamu)
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartReassign(group.name)}
                  className="text-muted-foreground hover:text-destructive h-8 px-2"
                  title={`Hapus grup "${group.name}" (pindahkan tamu ke grup lain)`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </ResponsiveDialog>
  );
}
