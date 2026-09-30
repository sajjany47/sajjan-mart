import { StoreShell } from '@/components/store/store-shell';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryLoading() {
  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl space-y-4 py-3 sm:py-6">
        {/* Hero banner */}
        <Skeleton className="h-24 w-full rounded-2xl sm:h-28" />

        {/* Category chips */}
        <div className="flex gap-2 overflow-hidden pb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-[76px] shrink-0 rounded-full" />
          ))}
        </div>

        {/* Search + sort + filter */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="hidden h-10 w-[160px] rounded-xl sm:block" />
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl lg:hidden" />
        </div>

        <Skeleton className="h-4 w-36" />

        {/* Sidebar + product grid */}
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-3 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-5 w-24" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-5 w-28" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="space-y-3 overflow-hidden rounded-2xl border border-border bg-card p-3"
              >
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </StoreShell>
  );
}
