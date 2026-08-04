import { StoreShell } from '@/components/store/store-shell';
import { CheckoutClient } from '@/components/store/checkout-client';

export default function CheckoutPage() {
  return (
    <StoreShell>
      <CheckoutClient />
    </StoreShell>
  );
}
