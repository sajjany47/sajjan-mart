import { StoreShell } from '@/components/store/store-shell';
import { AccountSidebar } from '@/components/store/account-sidebar';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          <AccountSidebar />
          <main className="mt-6 min-w-0 lg:mt-0">{children}</main>
        </div>
      </div>
    </StoreShell>
  );
}
