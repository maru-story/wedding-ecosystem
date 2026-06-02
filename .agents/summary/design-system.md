# Design System — Wedding Dashboard

> Single source of truth for visual language in `apps/dashboard`. All values are CSS custom properties defined in `globals.css` and consumed via Tailwind 4 `@theme` directives.

---

## Color Palette

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `sage` | `#6b806c` | Primary / brand color, primary buttons, active states (darker for contrast with white text) |
| `cream` | `#f7f4ea` | Background, sidebar, secondary surfaces |
| `copper` | `#b87c4c` | Accent rings, VIP badges, focus indicators |
| `blush` | `#ebd9d1` | Accent surfaces, hover states, soft highlights |
| `charcoal` | `#2d3436` | Primary text, headings, dark surfaces |

### Semantic Colors

| Token | Light Value | Usage |
|-------|-------------|-------|
| `success` | `#608c73` | Check-in confirmed, RSVP hadir, import success toast |
| `success-foreground` | `#ffffff` | Text on success backgrounds |
| `warning` | `#d99c4c` | Duplicate scan (YELLOW), partial import, caution states |
| `warning-foreground` | `#ffffff` | Text on warning backgrounds |
| `info` | `#5a8d9a` | Informational toasts, neutral status |
| `info-foreground` | `#ffffff` | Text on info backgrounds |
| `destructive` | `oklch(0.577 0.245 27.325)` | Delete actions, errors, RSVP menolak |

### Surface Tokens (light mode)

| CSS Var | Value | Role |
|---------|-------|------|
| `--background` | `#fdfcf7` | Page background — warm soft off-white |
| `--card` | `#ffffff` | Card / modal surface |
| `--popover` | `#ffffff` | Dropdown / popover surface |
| `--muted` | `#f3efe6` | Subdued surfaces, table headers, code blocks |
| `--border` | `#e6e0d5` | All borders — warm light |
| `--input` | `#e6e0d5` | Input borders |
| `--ring` | `#b87c4c` | Copper focus ring |

---

## Typography

| Role | Font | CSS Var | Tailwind class |
|------|------|---------|----------------|
| Headings (h1–h6) | Playfair Display | `--font-heading` | `font-heading` |
| Body / UI | Poppins | `--font-body`, `--font-sans` | `font-body`, `font-sans` |

### Type Scale

| Class | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-2xl font-bold font-heading` | 1.5rem | 700 | Page titles (h1) |
| `text-xl font-heading` | 1.25rem | 600 | Dialog titles, section headers |
| `text-base font-medium` | 1rem | 500 | Card titles, table column values |
| `text-sm` | 0.875rem | 400 | Body text, descriptions |
| `text-xs` | 0.75rem | 400 | Badges, secondary info, timestamps |
| `text-[11px]` | 0.6875rem | 400 | Helper text under inputs |

---

## Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| `space-y-6` | 1.5rem | Top-level page section gaps |
| `space-y-4` | 1rem | Form field gaps inside modals |
| `space-y-1.5` | 0.375rem | Label-to-input gaps |
| `p-6` | 1.5rem | Card / modal inner padding |
| `px-4 py-3` | 1rem / 0.75rem | Table cell padding |
| `gap-2` | 0.5rem | Button row gaps |
| `gap-1` | 0.25rem | Icon button gaps in action cells |

---

## Border Radius

Based on `--radius: 0.625rem`:

| Token | Calc | Value | Usage |
|-------|------|-------|-------|
| `--radius-sm` | `× 0.6` | ≈ 0.375rem | Small badges, chips |
| `--radius-md` | `× 0.8` | ≈ 0.5rem | Inputs, selects |
| `--radius-lg` | `× 1.0` | 0.625rem | Buttons (default) |
| `--radius-xl` | `× 1.4` | ≈ 0.875rem | Cards, dialogs |
| `rounded-xl` | Tailwind | 0.75rem | Tables, containers |
| `rounded-full` | Tailwind | 9999px | Badges, avatars |

---

## Shadows & Elevation

| Class | Usage |
|-------|-------|
| `shadow-sm` | Cards, table containers, modals at rest |
| `shadow-lg` | Dropdowns, floating elements |
| `shadow-xl` | Full-screen modals, popovers |

---

## Component Tokens

### Buttons

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| `default` | `primary` (sage) | `primary-foreground` (white `#ffffff`) | transparent |
| `outline` | `background` | `foreground` | `border` (warm) |
| `ghost` | transparent → `muted` on hover | `foreground` | none |
| `destructive` | `destructive/10` → `destructive/20` on hover | `destructive` | none |
| `secondary` | `secondary` (cream) | `secondary-foreground` | transparent |

### Badges

| Use case | Classes |
|----------|---------|
| Keluarga | `bg-primary/15 text-foreground border-transparent` |
| Teman | `bg-accent/40 text-foreground border-transparent` |
| Rekan Kerja | `bg-muted text-muted-foreground border-transparent` |
| VIP | `bg-copper/15 text-copper border-transparent font-semibold` |
| Hadir (RSVP) | `bg-success/15 text-success border-transparent` |
| Menolak | `bg-destructive/10 text-destructive border-transparent` |
| Belum RSVP | `bg-muted text-muted-foreground border-transparent` |

### Inputs

```
bg-card border-border/60 hover:bg-muted/10 transition-colors
focus-visible:ring-ring/50
```

### Cards / Containers

```
rounded-xl border border-border/40 bg-card shadow-sm
```

### Modals (DialogContent)

```
sm:max-w-md bg-card border-border/40
```

---

## Toast Design System (Sonner)

Toasts are rendered by `<Toaster>` in `providers.tsx` using the custom `sonner.tsx` component. CSS variables are injected via the Sonner `style` prop and override the default Sonner skin at the root level in `globals.css`.

### Toast Types & Visual Language

| Type | Background | Border | Icon color | Text |
|------|-----------|--------|------------|------|
| `default` | `--card` | `--border` | `--muted-foreground` | `--foreground` |
| `success` | `#f0f6f2` (success tint) | `#c4d9cc` | `#608c73` (success) | charcoal |
| `error` | `#fdf2f0` (destructive tint) | destructive/20 | destructive | charcoal |
| `warning` | `#fdf7ee` (warning tint) | `#e8c98a` | `#d99c4c` (warning) | charcoal |
| `info` | `#eef4f6` (info tint) | `#a8c5cd` | `#5a8d9a` (info) | charcoal |

### Typography inside Toasts

- **Title**: Poppins 0.875rem, `font-medium`, `--foreground`  
- **Description**: Poppins 0.8rem, `--muted-foreground`
- **Icons**: 1rem (16px), Lucide icons from `sonner.tsx`

### Toast Anatomy

```
┌─────────────────────────────────────────────────┐ ← rounded-xl, border, shadow-md
│ [icon]  Title text (font-medium)           [×]  │
│          Description text (muted, smaller)      │
└─────────────────────────────────────────────────┘
         ↑ left border accent (4px, type color)
```

---

## Motion & Animation

| Use case | Pattern |
|----------|---------|
| Page enter | `<FadeIn>` wrapper from `motion-wrapper.tsx` |
| Modal open/close | Radix built-in: `fade-in-0 zoom-in-95` |
| Table row hover | `transition-colors` |
| Buttons | `transition-all` (built into `buttonVariants`) |
| Toast enter | Sonner built-in slide-in from right |
| Progress bars | `transition-all duration-500` |

---

## Iconography

Library: **lucide-react** (always check `package.json` before adding new icons)

| Usage | Size class |
|-------|-----------|
| Action buttons in table | `h-4 w-4` |
| Toast icons | `size-4` |
| Empty state illustrations | `h-12 w-12` |
| Upload icon in CSV modal | `h-10 w-10` |

---

## Dark Mode

Dark mode is toggled via the `.dark` class on the root element (managed by `ThemeProvider`). All color tokens have dark-mode overrides defined in `globals.css`. The toast component reads `useTheme()` and passes the active theme to Sonner so it inherits dark mode correctly.

> **Note**: Dark mode brand values (sage, copper, blush) are not fully customised yet — they fall back to generic Tailwind dark values. A future improvement can add dedicated dark brand tokens.

---

## File Locations

| Asset | Path |
|-------|------|
| CSS design tokens | `apps/dashboard/src/app/globals.css` |
| Toast component | `apps/dashboard/src/components/ui/sonner.tsx` |
| Button | `apps/dashboard/src/components/ui/button.tsx` |
| Badge | `apps/dashboard/src/components/ui/badge.tsx` |
| Dialog | `apps/dashboard/src/components/ui/dialog.tsx` |
| Input | `apps/dashboard/src/components/ui/input.tsx` |
| Label | `apps/dashboard/src/components/ui/label.tsx` |
| Select | `apps/dashboard/src/components/ui/select.tsx` |
| Textarea | `apps/dashboard/src/components/ui/textarea.tsx` |
| Switch | `apps/dashboard/src/components/ui/switch.tsx` |
| Card | `apps/dashboard/src/components/ui/card.tsx` |
| Table | `apps/dashboard/src/components/ui/table.tsx` |
| Tabs | `apps/dashboard/src/components/ui/tabs.tsx` |
| Custom Tabs | `apps/dashboard/src/components/ui/custom-tabs.tsx` |
| Motion wrapper | `apps/dashboard/src/components/ui/motion-wrapper.tsx` |
| Providers (Toaster mount) | `apps/dashboard/src/app/providers.tsx` |
| Fonts | `apps/dashboard/src/app/layout.tsx` (Google Fonts) |
