"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group/toast font-body text-sm rounded-xl border shadow-md backdrop-blur-sm" +
            " !bg-[var(--toast-bg)] !border-[var(--toast-border)] !text-[var(--toast-text)]" +
            " [&>[data-icon]]:text-[var(--toast-icon)]",
          title: "font-medium text-[0.875rem] leading-snug !text-[var(--toast-text)]",
          description: "text-[0.8rem] leading-relaxed !text-[var(--toast-muted)]",
          closeButton:
            "!bg-[var(--toast-bg)] !border-[var(--toast-border)] !text-[var(--toast-muted)]" +
            " hover:!text-[var(--toast-text)] hover:!bg-[var(--toast-border)] transition-colors",
          actionButton:
            "!bg-[var(--toast-icon)] !text-white text-xs font-medium rounded-lg px-3 py-1.5",
          cancelButton:
            "!bg-[var(--toast-border)] !text-[var(--toast-muted)] text-xs font-medium rounded-lg px-3 py-1.5",
          icon: "!text-[var(--toast-icon)]",
          // Type-specific overrides via data attributes
          success:
            "[--toast-bg:#f0f6f2] [--toast-border:#c4d9cc] [--toast-text:#2d3436] [--toast-muted:#5a7a66] [--toast-icon:#608c73]" +
            " dark:[--toast-bg:oklch(0.22_0.03_150)] dark:[--toast-border:oklch(0.35_0.05_150)] dark:[--toast-icon:#7fba94]",
          error:
            "[--toast-bg:#fdf2f0] [--toast-border:oklch(0.75_0.1_27)] [--toast-text:#2d3436] [--toast-muted:#8b4f45] [--toast-icon:oklch(0.577_0.245_27.325)]" +
            " dark:[--toast-bg:oklch(0.22_0.04_27)] dark:[--toast-border:oklch(0.38_0.1_27)] dark:[--toast-icon:oklch(0.704_0.191_22.216)]",
          warning:
            "[--toast-bg:#fdf7ee] [--toast-border:#e8c98a] [--toast-text:#2d3436] [--toast-muted:#7a5e2a] [--toast-icon:#d99c4c]" +
            " dark:[--toast-bg:oklch(0.22_0.04_75)] dark:[--toast-border:oklch(0.42_0.09_75)] dark:[--toast-icon:#e8b86d]",
          info:
            "[--toast-bg:#eef4f6] [--toast-border:#a8c5cd] [--toast-text:#2d3436] [--toast-muted:#3d6570] [--toast-icon:#5a8d9a]" +
            " dark:[--toast-bg:oklch(0.22_0.03_210)] dark:[--toast-border:oklch(0.38_0.06_210)] dark:[--toast-icon:#7eb5c0]",
          default:
            "[--toast-bg:var(--card)] [--toast-border:var(--border)] [--toast-text:var(--foreground)] [--toast-muted:var(--muted-foreground)] [--toast-icon:var(--muted-foreground)]",
        },
      }}
      style={
        {
          // Default (normal type) fallback tokens — type-specific classNames above override these
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "0.75rem",
          "--toast-bg": "var(--card)",
          "--toast-border": "var(--border)",
          "--toast-text": "var(--foreground)",
          "--toast-muted": "var(--muted-foreground)",
          "--toast-icon": "var(--muted-foreground)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
