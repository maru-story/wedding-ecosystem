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
  bank_name: string;
  account_number: string;
  account_holder: string;
}

export function GiftForm({ content, onChange }: GiftFormProps) {
  const title = (content.title as string) || '';
  // Backward compat: read old 'description' key, prefer new 'intro_text'
  const introText = (content.intro_text as string) || (content.description as string) || '';
  // Backward compat: normalize old account keys (bank→bank_name, account_name→account_holder)
  const rawAccounts = (content.accounts as Record<string, string>[]) || [];
  const accounts: BankAccount[] = rawAccounts.map((a) => ({
    bank_name: a.bank_name || a.bank || '',
    account_number: a.account_number || '',
    account_holder: a.account_holder || a.account_name || '',
  }));

  const addAccount = () => {
    if (accounts.length >= 2) return;
    onChange({
      ...content,
      accounts: [...accounts, { bank_name: '', account_number: '', account_holder: '' }],
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
        <Label htmlFor="gift-title">Section Title</Label>
        <Input
          id="gift-title"
          type="text"
          value={title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder="Wedding Gift"
          className="bg-card border-border/60"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gift-intro">Intro Text</Label>
        <Textarea
          id="gift-intro"
          value={introText}
          onChange={(e) => onChange({ ...content, intro_text: e.target.value })}
          placeholder="Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika Anda ingin memberikan tanda kasih, kami menyediakan informasi di bawah ini."
          rows={3}
          className="bg-card border-border/60"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Rekening (maks 2)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAccount}
          disabled={accounts.length >= 2}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Tambah Rekening
        </Button>
      </div>

      {accounts.length === 0 && (
        <div className="border-border/60 bg-card rounded-lg border-2 border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Belum ada rekening. Klik tombol di atas untuk menambahkan.
          </p>
        </div>
      )}

      {accounts.map((account, index) => (
        <div
          key={index}
          className="border-border/40 bg-card space-y-4 rounded-xl border p-4 shadow-sm"
        >
          <div className="border-border/40 flex items-center justify-between border-b pb-2">
            <h4 className="text-foreground text-sm font-semibold">Rekening {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => removeAccount(index)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Hapus
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`bank_name-${index}`}>Nama Bank</Label>
            <Input
              id={`bank_name-${index}`}
              type="text"
              value={account.bank_name}
              onChange={(e) => updateAccount(index, 'bank_name', e.target.value)}
              placeholder="Contoh: BCA, Mandiri, BNI"
              className="bg-card border-border/60"
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
              className="bg-card border-border/60"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`account_holder-${index}`}>Atas Nama</Label>
            <Input
              id={`account_holder-${index}`}
              type="text"
              value={account.account_holder}
              onChange={(e) => updateAccount(index, 'account_holder', e.target.value)}
              placeholder="Nama pemilik rekening"
              className="bg-card border-border/60"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
