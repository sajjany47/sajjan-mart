'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-4">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Something went wrong!
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        We encountered an unexpected error while loading this page. Please try refreshing or explore our sections.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/category/food">
            <Home className="h-4 w-4" /> Explore Food
          </Link>
        </Button>
      </div>
    </div>
  );
}
