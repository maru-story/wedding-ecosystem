'use client';

import { useTheme } from '@/contexts/theme-context';
import type { ThemeColors } from '@/lib/theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'primary', label: 'Primary (Sage)' },
  { key: 'secondary', label: 'Secondary (Cream)' },
  { key: 'accent', label: 'Accent (Blush)' },
  { key: 'surface', label: 'Surface (White)' },
  { key: 'text', label: 'Text (Charcoal)' },
];

export default function ThemePage() {
  const { colors, presets, errors, updateColor, applyPreset, resetToDefault } = useTheme();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Pengaturan Tema</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kustomisasi warna dashboard sesuai tema pernikahan Anda
        </p>
      </div>

      {/* Preset Palettes */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Preset Palette</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="rounded-xl border border-border/80 bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <p className="mb-3 text-sm font-semibold text-foreground">{preset.name}</p>
              <div className="flex gap-1.5">
                {Object.entries(preset.colors).map(([key, color]) => (
                  <div
                    key={key}
                    className="h-8 w-8 rounded-full border border-border/60 shadow-inner"
                    style={{ backgroundColor: color }}
                    aria-label={`Warna ${key}: ${color}`}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Custom Color Inputs */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="font-heading text-lg font-semibold">Warna Kustom</CardTitle>
              <CardDescription className="mt-1">
                Masukkan kode warna hex (#RRGGBB atau #RGB) untuk kustomisasi manual
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
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label
                htmlFor={`color-${key}`}
                className="text-sm font-medium text-foreground"
              >
                {label}
              </Label>
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border border-border shadow-inner"
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
                      ? 'border-destructive focus-visible:ring-destructive bg-background'
                      : 'border-border/60 focus-visible:ring-ring bg-background font-sans text-sm'
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

      {/* Preview */}
      <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">Preview</CardTitle>
          <CardDescription>Visualisasi tampilan dashboard dengan tema warna saat ini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/80 p-6 shadow-inner" style={{ backgroundColor: colors.surface }}>
            <h3 className="font-heading text-xl font-bold" style={{ color: colors.primary }}>
              Contoh Heading
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: colors.text }}>
              Ini adalah contoh teks body dengan warna tema yang dipilih.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundColor: colors.primary }}
              >
                Tombol Primary
              </button>
              <button
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundColor: colors.accent }}
              >
                Tombol Accent
              </button>
            </div>
            <div className="mt-4 rounded-lg p-4 border border-border/40" style={{ backgroundColor: colors.secondary }}>
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                Ini adalah contoh card dengan warna secondary sebagai background.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
