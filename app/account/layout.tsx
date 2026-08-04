import { StoreShell } from '@/components/store/store-shell';
import { AccountSidebar } from '@/components/store/account-sidebar';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <AccountSidebar />
          <div>{children}</div>
        </div>
      </div>
    </StoreShell>
  );
}
