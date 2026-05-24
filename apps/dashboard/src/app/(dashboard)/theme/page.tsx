'use client';

import { useMemo, useState } from 'react';
import { useTheme } from '@/contexts/theme-context';
import type { ThemeColors } from '@/lib/theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Sparkles,
  Palette,
  Eye,
  Settings,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Component,
} from 'lucide-react';

function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return true;
  const color = hex.substring(1);
  let r = 0, g = 0, b = 0;
  if (color.length === 3) {
    r = parseInt(color[0] + color[0], 16);
    g = parseInt(color[1] + color[1], 16);
    b = parseInt(color[2] + color[2], 16);
  } else if (color.length === 6) {
    r = parseInt(color.substring(0, 2), 16);
    g = parseInt(color.substring(2, 4), 16);
    b = parseInt(color.substring(4, 6), 16);
  } else {
    return true;
  }
  const hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  );
  return hsp > 127.5;
}

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; description: string }[] = [
  { key: 'primary', label: 'Primary (Sage)', description: 'Warna utama untuk brand, tombol utama, dan state aktif.' },
  { key: 'secondary', label: 'Secondary (Cream)', description: 'Warna latar sidebar dan elemen secondary.' },
  { key: 'accent', label: 'Accent (Blush)', description: 'Warna hover, highlight lembut, dan latar VIP.' },
  { key: 'surface', label: 'Surface (White)', description: 'Warna latar belakang kartu dan modal.' },
  { key: 'text', label: 'Text (Charcoal)', description: 'Warna utama teks, heading, dan ikon gelap.' },
];

export default function ThemePage() {
  const { colors, presets, errors, updateColor, applyPreset, resetToDefault } = useTheme();
  const [selectedTab, setSelectedTab] = useState('customize');

  // Custom Form states for showcase
  const [formText, setFormText] = useState('');
  const [formTextarea, setFormTextarea] = useState('');
  const [formSelect, setFormSelect] = useState('option-1');
  const [formSwitch, setFormSwitch] = useState(true);

  const primaryContrastColor = useMemo(() => {
    return isLightColor(colors.primary) ? colors.text : colors.surface;
  }, [colors.primary, colors.text, colors.surface]);

  const accentContrastColor = useMemo(() => {
    return isLightColor(colors.accent) ? colors.text : colors.surface;
  }, [colors.accent, colors.text, colors.surface]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Kustomisasi Tema & Design System</h1>
          <p className="text-sm text-muted-foreground">
            Kelola warna brand undangan digital Anda dan tinjau implementasi UI components.
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md border border-border/40 bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="customize" className="flex items-center gap-2 rounded-lg py-2">
            <Palette className="h-4 w-4" />
            Atur Warna
          </TabsTrigger>
          <TabsTrigger value="showcase" className="flex items-center gap-2 rounded-lg py-2">
            <Component className="h-4 w-4" />
            Playground UI
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Customize Colors */}
        <TabsContent value="customize" className="space-y-6 mt-6">
          {/* Preset Palettes */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold text-foreground">Preset Palette Populer</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className="rounded-xl border border-border/60 bg-card p-4 text-left transition-all hover:border-primary/80 hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <p className="mb-3 text-sm font-semibold text-foreground">{preset.name}</p>
                  <div className="flex gap-2">
                    {Object.entries(preset.colors).map(([key, color]) => (
                      <div
                        key={key}
                        className="h-8 w-8 rounded-full border border-border/50 shadow-inner transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={`${key}: ${color}`}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Custom Color Inputs */}
          <Card className="border-border/40 shadow-sm bg-card rounded-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="font-heading text-lg font-semibold">Kustomisasi Warna Manual</CardTitle>
                  <CardDescription className="mt-1">
                    Sesuaikan hex code warna untuk menciptakan keselarasan visual yang unik.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                  className="border-border/60 text-muted-foreground hover:text-foreground"
                >
                  Reset ke Default
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {COLOR_FIELDS.map(({ key, label, description }) => (
                <div key={key} className="space-y-2 border border-border/30 rounded-lg p-3 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={`color-${key}`}
                      className="text-sm font-semibold text-foreground"
                    >
                      {label}
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal min-h-[32px]">
                    {description}
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-9 w-9 shrink-0 rounded-lg border border-border shadow-inner"
                      style={{ backgroundColor: colors[key] }}
                    />
                    <Input
                      id={`color-${key}`}
                      type="text"
                      value={colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      placeholder="#RRGGBB"
                      className={
                        errors?.[key]
                          ? 'border-destructive focus-visible:ring-destructive bg-background font-sans text-sm h-9'
                          : 'border-border/60 focus-visible:ring-ring bg-background font-sans text-sm h-9'
                      }
                      aria-invalid={!!errors?.[key]}
                      aria-describedby={errors?.[key] ? `error-${key}` : undefined}
                    />
                  </div>
                  {errors?.[key] && (
                    <p id={`error-${key}`} className="text-xs text-destructive font-semibold" role="alert">
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Color Preview */}
          <Card className="border-border/40 shadow-sm overflow-hidden bg-card rounded-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle className="font-heading text-lg font-semibold">Tinjauan Langsung (Live Preview)</CardTitle>
              </div>
              <CardDescription>Visualisasi mock UI dengan tema warna aktif saat ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/65 p-6 shadow-inner" style={{ backgroundColor: colors.surface }}>
                <h3 className="font-heading text-xl font-bold" style={{ color: colors.primary }}>
                  The Wedding of Romeo & Juliet
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: colors.text }}>
                  Merupakan suatu kehormatan bagi kami apabila Anda berkenan hadir dalam resepsi pernikahan kami.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    className="h-9 px-4 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ 
                      backgroundColor: colors.primary,
                      color: primaryContrastColor
                    }}
                  >
                    Tombol Utama
                  </Button>
                  <Button
                    className="h-9 px-4 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ 
                      backgroundColor: colors.accent,
                      color: accentContrastColor
                    }}
                  >
                    Tombol Aksen
                  </Button>
                </div>
                <div className="mt-4 rounded-lg p-4 border border-border/40" style={{ backgroundColor: colors.secondary }}>
                  <p className="text-sm font-medium" style={{ color: colors.text }}>
                    Ini adalah contoh kartu sekunder dengan latar belakang Cream (Secondary).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: UI Showcase & Playground */}
        <TabsContent value="showcase" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* 1. Palette & Swatches */}
            <Card className="border-border/40 shadow-sm bg-card rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg font-semibold">Palette Brand & Swatches</CardTitle>
                <CardDescription>Pencocokan warna global dalam tema aktif saat ini.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary border border-border shadow-sm" />
                      <div>
                        <p className="text-sm font-medium">Sage (Primary)</p>
                        <p className="text-xs text-muted-foreground">class: `bg-primary`</p>
                      </div>
                    </div>
                    <code className="text-xs font-mono">{colors.primary}</code>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-secondary border border-border shadow-sm" />
                      <div>
                        <p className="text-sm font-medium">Cream (Secondary)</p>
                        <p className="text-xs text-muted-foreground">class: `bg-secondary`</p>
                      </div>
                    </div>
                    <code className="text-xs font-mono">{colors.secondary}</code>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-accent border border-border shadow-sm" />
                      <div>
                        <p className="text-sm font-medium">Blush (Accent)</p>
                        <p className="text-xs text-muted-foreground">class: `bg-accent`</p>
                      </div>
                    </div>
                    <code className="text-xs font-mono">{colors.accent}</code>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-card border border-border shadow-sm" />
                      <div>
                        <p className="text-sm font-medium">Card/Surface</p>
                        <p className="text-xs text-muted-foreground">class: `bg-card`</p>
                      </div>
                    </div>
                    <code className="text-xs font-mono">{colors.surface}</code>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-foreground border border-border shadow-sm" />
                      <div>
                        <p className="text-sm font-medium">Charcoal (Text/Foreground)</p>
                        <p className="text-xs text-muted-foreground">class: `text-foreground`</p>
                      </div>
                    </div>
                    <code className="text-xs font-mono">{colors.text}</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Typography Scale */}
            <Card className="border-border/40 shadow-sm bg-card rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg font-semibold">Skala Tipografi</CardTitle>
                <CardDescription>Aturan hierarki teks yang disepakati.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border-b border-border/30 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">Page Title (h1) • `font-heading text-2xl font-bold`</p>
                    <h1 className="font-heading text-2xl font-bold">Judul Halaman Utama</h1>
                  </div>

                  <div className="border-b border-border/30 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">Section Header (h2) • `font-heading text-xl font-semibold`</p>
                    <h2 className="font-heading text-xl font-semibold">Subjudul Section Utama</h2>
                  </div>

                  <div className="border-b border-border/30 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">Card Title (h3) • `text-base font-medium`</p>
                    <h3 className="text-base font-medium">Judul Kartu Informasi</h3>
                  </div>

                  <div className="border-b border-border/30 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">Body Text • `text-sm text-foreground`</p>
                    <p className="text-sm text-foreground">Ini adalah deskripsi standar untuk menu dan daftar data undangan.</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Helper / Muted Text • `text-xs text-muted-foreground`</p>
                    <p className="text-xs text-muted-foreground">Disunting terakhir kali pada 12 Januari 2026 pukul 14:00 WIB</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Buttons Showcase */}
            <Card className="border-border/40 shadow-sm bg-card rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg font-semibold">Button Variants</CardTitle>
                <CardDescription>Konsistensi style tombol di seluruh platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="default">Default (Sage)</Button>
                  <Button variant="secondary">Secondary (Cream)</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground mr-2">Sizes:</span>
                  <Button size="xs" variant="default">Extra Small</Button>
                  <Button size="sm" variant="default">Small</Button>
                  <Button size="default" variant="default">Medium (Default)</Button>
                  <Button size="lg" variant="default">Large</Button>
                </div>
              </CardContent>
            </Card>

            {/* 4. Badges & Labels */}
            <Card className="border-border/40 shadow-sm bg-card rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg font-semibold">Badge & Label Kategori</CardTitle>
                <CardDescription>Penandaan status RSVP dan grup tamu.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-medium text-muted-foreground self-center mr-2">Grup Tamu:</span>
                    <Badge className="bg-primary/15 text-foreground border-transparent">Keluarga</Badge>
                    <Badge className="bg-accent/40 text-foreground border-transparent">Teman</Badge>
                    <Badge className="bg-muted text-muted-foreground border-transparent">Rekan Kerja</Badge>
                    <Badge className="bg-copper/15 text-copper border-transparent font-semibold">VIP</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                    <span className="text-xs font-medium text-muted-foreground self-center mr-2">Status RSVP:</span>
                    <Badge className="bg-success/15 text-success border-transparent">Hadir</Badge>
                    <Badge className="bg-destructive/10 text-destructive border-transparent">Menolak</Badge>
                    <Badge className="bg-muted text-muted-foreground border-transparent">Belum RSVP</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. Interactive Form Elements */}
            <Card className="border-border/40 shadow-sm bg-card rounded-xl lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg font-semibold">Interactive Form Elements</CardTitle>
                <CardDescription>Input fields, selects, textarea, dan toggle switch sesuai standard shadcn.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="playground-input" className="text-sm font-medium text-foreground">
                      Input Teks
                    </Label>
                    <Input
                      id="playground-input"
                      type="text"
                      placeholder="Masukkan nama atau nilai..."
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      className="bg-card border-border/60 focus-visible:ring-ring"
                    />
                    <p className="text-[11px] text-muted-foreground">Isi teks pembantu di sini.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="playground-select" className="text-sm font-medium text-foreground">
                      Pilihan (Select)
                    </Label>
                    <Select value={formSelect} onValueChange={setFormSelect}>
                      <SelectTrigger id="playground-select" className="bg-card border-border/60">
                        <SelectValue placeholder="Pilih opsi..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="option-1">Opsi Pertama</SelectItem>
                        <SelectItem value="option-2">Opsi Kedua</SelectItem>
                        <SelectItem value="option-3">Opsi Ketiga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="playground-textarea" className="text-sm font-medium text-foreground">
                      Textarea (Teks Panjang)
                    </Label>
                    <Textarea
                      id="playground-textarea"
                      placeholder="Masukkan pesan atau ucapan pernikahan..."
                      value={formTextarea}
                      onChange={(e) => setFormTextarea(e.target.value)}
                      className="bg-card border-border/60 focus-visible:ring-ring min-h-[95px]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10">
                    <div className="space-y-0.5">
                      <Label htmlFor="playground-switch" className="text-sm font-medium text-foreground">
                        Status Kehadiran Publik
                      </Label>
                      <p className="text-xs text-muted-foreground">Izinkan tamu melihat daftar kehadiran.</p>
                    </div>
                    <Switch
                      id="playground-switch"
                      checked={formSwitch}
                      onCheckedChange={setFormSwitch}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. Overlays & Feedback (Sonner & Dialog) */}
            <Card className="border-border/40 shadow-sm bg-card rounded-xl lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg font-semibold">Overlays & Feedback (Toast / Dialog)</CardTitle>
                <CardDescription>Pemicu notifikasi sonner dan pratinjau modal interaktif.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                
                {/* Toast Triggers */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground block mb-1">
                    Sonner Toast Custom Design
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-border/60"
                      onClick={() => toast.success('Check-in Berhasil', {
                        description: 'Tamu Romeo Montague telah terdaftar masuk.',
                      })}
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Success Toast
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-border/60"
                      onClick={() => toast.warning('Sudah Check-in', {
                        description: 'Tamu Juliet Capulet terdeteksi melakukan scan ulang.',
                      })}
                    >
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Warning Toast
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-border/60"
                      onClick={() => toast.error('QR Tidak Valid', {
                        description: 'Kode QR tidak dikenali oleh sistem acara.',
                      })}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                      Error Toast
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-border/60"
                      onClick={() => toast.info('Sinkronisasi Data', {
                        description: 'Mengunggah 3 antrean data check-in lokal.',
                      })}
                    >
                      <Info className="h-4 w-4 text-info" />
                      Info Toast
                    </Button>
                  </div>
                </div>

                {/* Dialog Trigger */}
                <div className="flex flex-col justify-end space-y-2">
                  <Label className="text-sm font-medium text-foreground block">
                    Dialog Modal Popup
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Menampilkan dialog standard dengan header, deskripsi, dan tombol aksi terintegrasi dark-mode.
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="default" className="w-full sm:w-fit mt-2">
                        Buka Contoh Dialog Modal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card border-border/40 rounded-xl">
                      <DialogHeader>
                        <DialogTitle className="font-heading text-lg font-bold text-foreground">
                          Konfirmasi Kehadiran Go-Show
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                          Tamu ini akan terdaftar sebagai tamu walk-in dan langsung check-in di lokasi acara.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-3">
                        <div className="space-y-1">
                          <Label htmlFor="dialog-name" className="text-xs font-semibold text-foreground">
                            Nama Tamu
                          </Label>
                          <Input id="dialog-name" readOnly value="Tamu Go-Show Baru" className="h-9 bg-muted/40 border-border/60" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="dialog-group" className="text-xs font-semibold text-foreground">
                            Grup Tamu
                          </Label>
                          <Input id="dialog-group" readOnly value="Teman" className="h-9 bg-muted/40 border-border/60" />
                        </div>
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                          <Button type="button" variant="outline" className="border-border/60">
                            Batal
                          </Button>
                        </DialogClose>
                        <Button type="button" onClick={() => {
                          toast.success('Check-in Berhasil', { description: 'Tamu go-show berhasil ditambahkan.' });
                        }}>
                          Konfirmasi Hadir
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
