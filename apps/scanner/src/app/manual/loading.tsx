/**
 * Loading state for the manual check-in page.
 */
export default function ManualCheckInLoading() {
  return (
    <div className="bg-cream min-h-screen">
      <header className="border-border/60 bg-card sticky top-10 z-40 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-charcoal/10 h-9 w-9 animate-pulse rounded-lg" />
          <div className="bg-charcoal/10 h-5 w-32 animate-pulse rounded" />
        </div>
      </header>
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="border-sage mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-charcoal/60 mt-3 text-sm">Memuat...</p>
        </div>
      </div>
    </div>
  );
}
