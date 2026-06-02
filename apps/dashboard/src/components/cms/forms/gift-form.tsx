'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface GiftFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

interface BankAccount {
  bank: string;
  account_number: string;
  account_name: string;
}

export function GiftForm({ content, onChange }: GiftFormProps) {
  const accounts = (content.accounts as BankAccount[]) || [];
  const description = (content.description as string) || '';

  const addAccount = () => {
    onChange({
      ...content,
      accounts: [...accounts, { bank: '', account_number: '', account_name: '' }],
    });
  };

  const updateAccount = (index: number, field: keyof BankAccount, value: string) => {
    const updated = [...accounts];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...content, accounts: updated });
  };

  const removeAccount = (index: number) => {
    const updated = accounts.filter((_, i) => i !== index);
    onChange({ ...content, accounts: updated });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="gift-desc">Deskripsi</Label>
        <Textarea
          id="gift-desc"
          value={description}
          onChange={(e) => onChange({ ...content, description: e.target.value })}
          placeholder="Contoh: Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika Anda ingin memberikan tanda kasih..."
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Rekening</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAccount}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Tambah Rekening
        </Button>
      </div>

      {accounts.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-border/60 p-6 text-center bg-card">
          <p className="text-sm text-muted-foreground">Belum ada rekening. Klik tombol di atas untuk menambahkan.</p>
        </div>
      )}

      {accounts.map((account, index) => (
        <div key={index} className="rounded-xl border border-border/40 bg-card p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="text-sm font-semibold text-foreground">Rekening {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => removeAccount(index)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Hapus
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`bank-${index}`}>Nama Bank</Label>
            <Input
              id={`bank-${index}`}
              type="text"
              value={account.bank}
              onChange={(e) => updateAccount(index, 'bank', e.target.value)}
              placeholder="Contoh: BCA, Mandiri, BNI"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`account_number-${index}`}>Nomor Rekening</Label>
            <Input
              id={`account_number-${index}`}
              type="text"
              value={account.account_number}
              onChange={(e) => updateAccount(index, 'account_number', e.target.value)}
              placeholder="1234567890"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`account_name-${index}`}>Atas Nama</Label>
            <Input
              id={`account_name-${index}`}
              type="text"
              value={account.account_name}
              onChange={(e) => updateAccount(index, 'account_name', e.target.value)}
              placeholder="Nama pemilik rekening"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
