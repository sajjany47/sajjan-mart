import { Loader2 } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { ZeroChargesBanner } from '@/components/store/zero-charges-banner';

export default function PujaLoading() {
  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6">
        <ZeroChargesBanner />
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-background/50 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading pujas...</span>
        </div>
      </div>
    </StoreShell>
  );
}