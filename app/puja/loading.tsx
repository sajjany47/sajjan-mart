import { StoreShell } from '@/components/store/store-shell';
import { Skeleton } from '@/components/ui/skeleton';

export default function PujaLoading() {
  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-5">
        {/* Hero banner */}
        <Skeleton className="h-[104px] w-full rounded-2xl sm:h-[120px]" />

        {/* Search + count */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-11 w-full max-w-md rounded-xl" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Puja grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card"
            >
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="space-y-2.5 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <div className="flex gap-1 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StoreShell>
  );
}
