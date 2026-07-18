import Link from 'next/link';
import { StoreShell } from '@/components/store/store-shell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-md py-12">
        <div className="rounded-2xl border border-border bg-card p-8">
          {children}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to Sajjan Mart&apos;s{' '}
          <Link href="/terms" className="underline">Terms</Link> and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </StoreShell>
  );
}
